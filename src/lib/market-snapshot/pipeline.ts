/**
 * MARKET SNAPSHOT — PER-SYMBOL SIGNAL PIPELINE
 *
 * Pipeline: fetchPrice → structure → volume → momentum → whale → derivatives → score → decision
 * All modules use the same timestamped snapshot to prevent inconsistent data.
 */

import type { MarketId } from "@/lib/market-data/shared/types";
import { getSnapshot } from "@/lib/market-data/shared/price-service";
import { getStructureMetrics } from "@/lib/market-data/shared/structure-service";
import { getVolumeMetrics } from "@/lib/market-data/shared/volume-service";
import { getWhaleMetrics } from "@/lib/market-data/shared/whale-service";
import { getDerivativesMetrics } from "@/lib/market-data/shared/derivatives-service";
import { clamp } from "@/lib/market-data/shared/utils";
import type {
  MarketSignal,
  ScoreBreakdown,
  SignalClassification,
  SignalDecision,
  SetupType,
  SignalDirection,
} from "./types";

// ── Weights by market type ────────────────────────────────────────────────────

const CRYPTO_WEIGHTS = {
  structure:   0.25,
  volume:      0.20,
  derivatives: 0.20,
  whale:       0.20,
  momentum:    0.15,
} as const;

const EQUITY_WEIGHTS = {
  structure:   0.35,
  volume:      0.30,
  momentum:    0.35,
} as const;

// ── Score computation ─────────────────────────────────────────────────────────

function normStructure(raw: number)    { return clamp(0, 100, (raw / 20) * 100); }
function normVolume(raw: number)       { return clamp(0, 100, (raw / 20) * 100); }
function normDerivatives(raw: number)  { return clamp(0, 100, (raw / 15) * 100); }
function normWhale(raw: number)        { return clamp(0, 100, (raw / 15) * 100); }
function normMomentum(movePct: number) { return clamp(0, 100, 50 + movePct * 4); }

function computeScore(
  marketId: MarketId,
  structureN: number,
  volumeN: number,
  momentumN: number,
  whaleN: number | null,
  derivativesN: number | null,
): ScoreBreakdown {
  let final: number;
  if (marketId === "crypto") {
    final =
      structureN   * CRYPTO_WEIGHTS.structure   +
      volumeN      * CRYPTO_WEIGHTS.volume      +
      (derivativesN ?? 0) * CRYPTO_WEIGHTS.derivatives +
      (whaleN ?? 0)       * CRYPTO_WEIGHTS.whale       +
      momentumN    * CRYPTO_WEIGHTS.momentum;
  } else {
    final =
      structureN * EQUITY_WEIGHTS.structure +
      volumeN    * EQUITY_WEIGHTS.volume    +
      momentumN  * EQUITY_WEIGHTS.momentum;
  }
  return {
    structure:   Math.round(structureN),
    volume:      Math.round(volumeN),
    momentum:    Math.round(momentumN),
    whale:       whaleN !== null ? Math.round(whaleN) : null,
    derivatives: derivativesN !== null ? Math.round(derivativesN) : null,
    final:       Math.round(clamp(0, 100, final)),
  };
}

function classify(score: number): SignalClassification {
  if (score >= 75) return "STRONG_SIGNAL";
  if (score >= 60) return "DEVELOPING";
  if (score >= 45) return "EARLY";
  return "IGNORE";
}

// ── Decision engine ───────────────────────────────────────────────────────────

function makeDecision(
  score: number,
  trendShift: number,
  movePct: number,
  compressionPct: number,
  anomalyScore: number,
  flowBias: "bullish" | "bearish" | "neutral",
): SignalDecision {
  if (score < 45) {
    return { direction: "NONE", confidence: score, setupType: "ACCUMULATION", reason: "Score below threshold — no actionable setup" };
  }

  // Setup type
  let setupType: SetupType;
  if (compressionPct < 1.5 && anomalyScore > 8) {
    setupType = "BREAKOUT";
  } else if (Math.abs(movePct) > 5 && flowBias !== "bullish") {
    setupType = "REVERSAL";
  } else {
    setupType = "ACCUMULATION";
  }

  // Direction votes
  const bullish =
    (trendShift > 0 ? 1 : 0) +
    (flowBias === "bullish" ? 1 : 0) +
    (movePct > 0 && movePct < 6 ? 1 : 0);
  const bearish =
    (trendShift < 0 ? 1 : 0) +
    (flowBias === "bearish" ? 1 : 0) +
    (movePct < -2 ? 1 : 0);

  let direction: SignalDirection;
  if (bullish >= bearish + 2)      direction = "LONG";
  else if (bearish >= bullish + 2) direction = "SHORT";
  else                              direction = "NONE";

  // Human-readable reason
  const parts: string[] = [];
  if (compressionPct < 1.5) parts.push("price compressed");
  if (anomalyScore > 8) parts.push(`volume +${anomalyScore.toFixed(0)}pt anomaly`);
  if (flowBias !== "neutral") parts.push(`${flowBias} whale flow`);
  if (Math.abs(movePct) > 1) parts.push(`${movePct > 0 ? "+" : ""}${movePct.toFixed(1)}% move`);
  if (trendShift > 0) parts.push("EMA bullish cross");
  if (trendShift < 0) parts.push("EMA bearish cross");

  const confidence = Math.round(score * (direction !== "NONE" ? 1 : 0.65));

  return {
    direction,
    confidence: clamp(0, 100, confidence),
    setupType,
    reason: parts.length > 0 ? parts.join(", ") : "Multi-factor alignment",
  };
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function runSymbolPipeline(
  symbol: string,
  name: string,
  marketId: MarketId,
): Promise<MarketSignal> {
  const scannedAtMs = Date.now();

  // All metrics from the same timestamp window
  const [snapshot, structure, volume, whale, derivatives] = await Promise.all([
    getSnapshot(symbol, marketId),
    getStructureMetrics(symbol, marketId),
    getVolumeMetrics(symbol, marketId),
    getWhaleMetrics(symbol, marketId),
    getDerivativesMetrics(symbol, marketId),
  ]);

  const structureN   = normStructure(structure.structureScore);
  const volumeN      = normVolume(volume.anomalyScore);
  const momentumN    = normMomentum(structure.movePct);
  const whaleN       = marketId === "crypto" ? normWhale(whale.whaleScore) : null;
  const derivativesN = marketId === "crypto" ? normDerivatives(derivatives.derivativesScore) : null;

  const breakdown = computeScore(marketId, structureN, volumeN, momentumN, whaleN, derivativesN);
  const classification = classify(breakdown.final);
  const decision = makeDecision(
    breakdown.final,
    structure.trendShift,
    structure.movePct,
    structure.compressionPct,
    volume.anomalyScore,
    whale.flowBias,
  );

  // Log score breakdown for transparency
  console.log(
    `[MarketSnapshot] ${symbol} | score=${breakdown.final} (${classification}) | ` +
    `dir=${decision.direction} | struct=${breakdown.structure} vol=${breakdown.volume} ` +
    `mom=${breakdown.momentum} whale=${breakdown.whale ?? "n/a"} deriv=${breakdown.derivatives ?? "n/a"} | ` +
    `${decision.reason}`,
  );

  return {
    symbol,
    name,
    marketId,
    price: snapshot.price,
    signalScore: breakdown.final,
    classification,
    breakdown,
    decision,
    scannedAtMs,
    priceSource: snapshot.source,
    movePct: Number(structure.movePct.toFixed(2)),
  };
}

export async function runSymbolPipelineSafe(
  symbol: string,
  name: string,
  marketId: MarketId,
): Promise<MarketSignal> {
  try {
    return await runSymbolPipeline(symbol, name, marketId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.warn(`[MarketSnapshot] ${symbol} pipeline failed: ${msg}`);
    return {
      symbol,
      name,
      marketId,
      price: 0,
      signalScore: 0,
      classification: "IGNORE",
      breakdown: { structure: 0, volume: 0, momentum: 0, whale: null, derivatives: null, final: 0 },
      decision: { direction: "NONE", confidence: 0, setupType: "ACCUMULATION", reason: "data unavailable" },
      scannedAtMs: Date.now(),
      priceSource: "unknown",
      movePct: 0,
      error: msg,
    };
  }
}
