import { getIndiaCompanyName, isIndiaMarketOpen } from "@/lib/market-data/india/adapter";
import { getMarketSymbols, getSnapshot } from "@/lib/market-data/shared/price-service";
import { getCatalystRows } from "@/lib/market-data/shared/catalyst-service";
import { getDerivativesMetrics } from "@/lib/market-data/shared/derivatives-service";
import { getStructureMetrics } from "@/lib/market-data/shared/structure-service";
import { getVolumeMetrics } from "@/lib/market-data/shared/volume-service";
import { getWhaleMetrics } from "@/lib/market-data/shared/whale-service";
import type {
  CatalystRow,
  DerivativesRow,
  LiquidationRow,
  MarketId,
  MarketSymbolInfo,
  PredictionSignal,
  WhaleFlowRow,
} from "@/lib/market-data/shared/types";
import { clamp } from "@/lib/market-data/shared/utils";
import { computePredictionScore } from "@/lib/scoring/prediction-score";

function stageFromSignal(score: number, movedPct: number): PredictionSignal["stage"] {
  if (Math.abs(movedPct) >= 8) return "LATE";
  if (score >= 85) return "ACTIVE";
  if (score >= 76) return "DEVELOPING";
  return "EARLY";
}

function riskPenaltyFromSignal(movedPct: number, ageMs: number, overextended: boolean) {
  return Math.round(clamp(0, 20,
    (Math.abs(movedPct) > 8 ? 10 : Math.abs(movedPct) > 5 ? 6 : 0) +
    (ageMs > 5_000 ? 10 : ageMs > 3_000 ? 6 : 0) +
    (overextended ? 4 : 0),
  ));
}

// ── Per-symbol computation (used by background cache scanner) ─────────────────

export async function computeSymbolSignal(
  item: MarketSymbolInfo,
  marketId: MarketId,
  catalystMap: Map<string, CatalystRow>,
): Promise<PredictionSignal | null> {
  try {
    const snapshot    = await getSnapshot(item.symbol, marketId);
    const structure   = await getStructureMetrics(item.symbol, marketId);
    const volume      = await getVolumeMetrics(item.symbol, marketId);
    const whale       = await getWhaleMetrics(item.symbol, marketId);
    const derivatives = await getDerivativesMetrics(item.symbol, marketId);
    const catalyst    = catalystMap.get(item.symbol);

    const accumulation = Math.round(clamp(0, 25,
      (structure.compressionPct <= 1 ? 10 : 4) +
      Math.min(8, structure.equalZoneHits) +
      (Math.abs(structure.movePct) < 3 ? 7 : 2),
    ));
    const riskPenalty = riskPenaltyFromSignal(structure.movePct, snapshot.ageMs, Math.abs(structure.movePct) > 6);
    const score = computePredictionScore({
      marketId,
      accumulation,
      structure:    structure.structureScore,
      volumeAnomaly: volume.anomalyScore,
      whale:        whale.whaleScore,
      derivatives:  derivatives.derivativesScore,
      catalyst:     Math.min(10, Math.round((catalyst?.catalystScore ?? 0) / 10)),
      riskPenalty,
    });
    const stage = stageFromSignal(score, structure.movePct);

    // Per-market thresholds — Yahoo Finance data is inherently slower/noisier.
    const maxAgeMs = marketId === "crypto" ? 5_000  : 60_000;
    const maxMove  = marketId === "crypto" ? 5      : 20;
    const minScore = marketId === "crypto" ? 70     : 50;
    if (snapshot.ageMs > maxAgeMs || Math.abs(structure.movePct) > maxMove || score <= minScore) return null;

    return {
      symbol:      item.symbol,
      marketId,
      companyName: marketId === "india" ? await getIndiaCompanyName(item.symbol) : item.name,
      price:       snapshot.price,
      signalScore: score,
      stage,
      accumulation,
      structure:    structure.structureScore,
      volumeAnomaly: volume.anomalyScore,
      whale:        whale.whaleScore,
      derivatives:  derivatives.derivativesScore,
      catalyst:     Math.min(10, Math.round((catalyst?.catalystScore ?? 0) / 10)),
      riskPenalty,
      breakoutProbability: score,
      relativeStrength: marketId === "india"
        ? Math.round(clamp(0, 100, 48 + structure.structureScore - riskPenalty))
        : undefined,
      freshness:   snapshot.freshness,
      movedPct:    Number(structure.movePct.toFixed(2)),
      reason: marketId === "india"
        ? `${item.name}: compression + VWAP-style reclaim + relative strength vs NIFTY watch.`
        : marketId === "crypto"
        ? `${item.symbol}: accumulation + flow + derivatives alignment before expansion.`
        : `${item.name}: structure tightening with improving volume before breakout.`,
      priceSource: snapshot.source,
    } satisfies PredictionSignal;
  } catch {
    return null;
  }
}

// ── getPredictionSignals — reads from background cache, falls back to live ────

export async function getPredictionSignals(marketId: MarketId): Promise<PredictionSignal[]> {
  // Import lazily to avoid circular deps between service ↔ cache store.
  const { getCachedPredictionSignals, ensurePredictionCacheStarted } = await import("@/lib/prediction-cache/store");
  ensurePredictionCacheStarted();

  const cached = getCachedPredictionSignals(marketId);
  if (cached.length > 0) return cached;

  // Cache cold (first startup) — use a curated seed of the most liquid symbols per
  // market so the warm-up has a high hit rate against external APIs.
  const SEED: Partial<Record<MarketId, string[]>> = {
    india: ["RELIANCE","TCS","HDFCBANK","INFY","HINDUNILVR","ICICIBANK","KOTAKBANK","SBIN","BHARTIARTL","ITC","AXISBANK","LT","BAJFINANCE","WIPRO","ASIANPAINT","MARUTI","SUNPHARMA","ULTRACEMCO","TITAN","ADANIENT"],
    us:    ["AAPL","MSFT","NVDA","AMZN","GOOGL","META","TSLA","AMD","PLTR","MSTR","SMCI","INTC"],
  };
  const seedSymbols = SEED[marketId];
  const full = await getMarketSymbols(marketId);
  const universe = seedSymbols
    ? full.filter((s) => seedSymbols.includes(s.symbol))
    : full.slice(0, 20);
  const catalysts = await getCatalystRows(marketId);
  const catalystMap = new Map(catalysts.map((c) => [c.symbol, c]));
  const results: PredictionSignal[] = [];
  for (const item of universe) {
    const sig = await computeSymbolSignal(item, marketId, catalystMap);
    if (sig) results.push(sig);
  }
  return results.sort((a, b) => b.signalScore - a.signalScore);
}

// ── Whale / Derivatives / Liquidation (deterministic — no background needed) ──
// Whale & derivatives use a hash seed (no HTTP). Liquidation needs price only
// (cached). All three are fast enough to run on-request with a 200-symbol cap.

export async function getWhaleFlowRows(): Promise<WhaleFlowRow[]> {
  const universe = (await getMarketSymbols("crypto")).slice(0, 200);
  const rows = await Promise.all(universe.map(async (item) => {
    const whale = await getWhaleMetrics(item.symbol, "crypto");
    return {
      symbol:      item.symbol,
      marketId:    "crypto",
      whaleScore:  whale.whaleScore,
      accumulation: whale.accumulation,
      flowBias:    whale.flowBias,
      confidence:  whale.confidence,
      reason:      `${item.name} shows ${whale.flowBias} flow with accumulation ${whale.accumulation}.`,
    } satisfies WhaleFlowRow;
  }));
  return rows.sort((a, b) => b.whaleScore - a.whaleScore);
}

export async function getDerivativesRows(): Promise<DerivativesRow[]> {
  const universe = (await getMarketSymbols("crypto")).slice(0, 200);
  const rows = await Promise.all(universe.map(async (item) => {
    const metrics = await getDerivativesMetrics(item.symbol, "crypto");
    return {
      symbol:           item.symbol,
      marketId:         "crypto",
      funding:          metrics.funding,
      openInterest:     metrics.openInterest,
      derivativesScore: metrics.derivativesScore,
      stage:            metrics.derivativesScore >= 11 ? "DEVELOPING" : "EARLY",
      reason:           `${item.name} derivatives: funding ${metrics.funding.toFixed(4)}, OI ${Math.round(metrics.openInterest / 1_000_000)}M.`,
    } satisfies DerivativesRow;
  }));
  return rows.sort((a, b) => b.derivativesScore - a.derivativesScore);
}

export async function getLiquidationRows(): Promise<LiquidationRow[]> {
  const universe = (await getMarketSymbols("crypto")).slice(0, 200);
  const rows = await Promise.all(universe.map(async (item) => {
    const snapshot = await getSnapshot(item.symbol, "crypto").catch(() => null);
    if (!snapshot) return null;
    return {
      symbol:              item.symbol,
      marketId:            "crypto",
      longLiquidationZone: snapshot.price * 0.97,
      shortLiquidationZone: snapshot.price * 1.03,
      heatScore:           Math.round(clamp(0, 100, 55 + (snapshot.freshness === "GOOD" ? 12 : 3))),
      reason:              `${item.name} liquidation bands cluster around +/-3% from spot.`,
    } satisfies LiquidationRow;
  }));
  return rows.filter((r): r is LiquidationRow => Boolean(r)).sort((a, b) => b.heatScore - a.heatScore);
}

export async function getIndiaSignals() {
  const rows = await getPredictionSignals("india");
  return { marketOpen: isIndiaMarketOpen(), rows };
}
