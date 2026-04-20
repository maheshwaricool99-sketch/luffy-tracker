import { recordSignalAudit } from "@/lib/audit/signal-audit-log";
import { validatePublishedSignalSchema } from "@/lib/validation/schema-validator";
import { buildInvalidationRules, buildRationale } from "./rationale-builder";
import { upsertSignal } from "./signal-store";
import type { AggregatedSignalCandidate, PublishedSignal, SignalFeatureContext } from "./signal-types";

function classifySignal(candidate: AggregatedSignalCandidate, context: SignalFeatureContext): PublishedSignal["class"] {
  if (candidate.confidence >= 85 && candidate.expectedR >= 2 && candidate.dataQuality === "healthy" && context.regime.trend !== "neutral") return "elite";
  if (candidate.confidence >= 75 && candidate.expectedR >= 1.7) return "strong";
  return "watchlist";
}

export function publishSignal(candidate: AggregatedSignalCandidate, context: SignalFeatureContext) {
  const signal: PublishedSignal = {
    id: `${candidate.market}-${candidate.symbol}-${candidate.timestamp}`,
    symbol: candidate.symbol,
    market: candidate.market,
    direction: candidate.direction,
    confidence: Math.round(candidate.confidence),
    class: classifySignal(candidate, context),
    entry: Number(context.entry.toFixed(6)),
    stopLoss: Number(context.stopLoss.toFixed(6)),
    takeProfit: Number(context.takeProfit.toFixed(6)),
    expectedR: Number(candidate.expectedR.toFixed(2)),
    timestamp: candidate.timestamp,
    regime: context.regime,
    scoreBreakdown: {
      structure: candidate.scoreBreakdown.structure,
      momentum: candidate.scoreBreakdown.momentum,
      volume: candidate.scoreBreakdown.volume,
      volatility: candidate.scoreBreakdown.volatility,
      trend: candidate.scoreBreakdown.trend,
      derivatives: candidate.scoreBreakdown.derivatives,
      rr: candidate.scoreBreakdown.rr,
    },
    rationale: buildRationale(candidate, context),
    invalidatesOn: buildInvalidationRules(context, candidate.direction),
    contributors: {
      advanced: candidate.contributors.continuation_model,
      expert: candidate.contributors.breakout_model,
      ace: candidate.contributors.reversal_model,
      luffy: candidate.contributors.high_confidence_filter,
      lite: candidate.contributors.early_detection_filter,
    },
    dataQuality: candidate.dataQuality,
    sourceMeta: {
      primarySource: context.priceSnapshot.source,
      fallbackSource: context.priceSnapshot.fallback ?? undefined,
      priceAgeMs: context.priceSnapshot.ageMs,
      candleAgeMs: context.candleAgeMs,
      dataState:
        context.priceSnapshot.deliveryState === "cached"
          ? "cached"
          : context.priceSnapshot.freshness === "GOOD"
            ? "live"
            : context.priceSnapshot.freshness === "OK"
              ? "delayed"
              : "stale",
    },
    lifecycleState: "published",
  };
  if (!validatePublishedSignalSchema(signal)) {
    throw new Error(`published signal schema invalid for ${signal.symbol}`);
  }
  upsertSignal(signal);
  recordSignalAudit({
    signalId: signal.id,
    symbol: signal.symbol,
    market: signal.market,
    state: "published",
    reason: "publish-guard-passed",
    payload: signal,
    timestamp: Date.now(),
  });
  return signal;
}
