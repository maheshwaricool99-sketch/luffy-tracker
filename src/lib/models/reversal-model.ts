import { clamp } from "@/lib/market-data/shared/utils";
import type { ModelOutput, SignalFeatureContext } from "@/lib/signals/signal-types";

export function runReversalModel(context: SignalFeatureContext): ModelOutput {
  const overextended = Math.abs(context.structure.movePct) > 4 || context.regime.volatility === "high";
  const direction = overextended
    ? context.structure.trendShift > 0 ? "short" : "long"
    : "none";
  const strength = clamp(0, 100, overextended ? 70 + Math.min(18, Math.abs(context.structure.movePct) * 2) : 28);
  const confidence = clamp(0, 100, overextended ? 62 + (context.regime.volatility === "high" ? 12 : 4) : 25);
  return {
    symbol: context.symbol,
    market: context.market,
    direction,
    strength,
    confidence,
    timestamp: context.priceSnapshot.tsReceived,
    features: {
      structure: clamp(0, 100, context.structure.score * 4),
      momentum: clamp(0, 100, 100 - context.momentumScore),
      volume: clamp(0, 100, context.volume.anomalyScore * 4),
      volatility: context.regime.volatility === "high" ? 82 : 46,
      trend: context.regime.trend === "neutral" ? 55 : 40,
      derivatives: clamp(0, 100, context.derivativesScore * 5),
    },
    meta: {
      sourceModel: "reversal_model",
      candleTimeframe: "1m",
      dataQuality: context.priceSnapshot.freshness === "GOOD" ? "healthy" : "stale",
    },
  };
}
