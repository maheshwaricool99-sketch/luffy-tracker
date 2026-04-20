import { clamp } from "@/lib/market-data/shared/utils";
import type { ModelOutput, SignalFeatureContext } from "@/lib/signals/signal-types";

export function runHighConfidenceFilter(context: SignalFeatureContext): ModelOutput {
  const aligned = context.regime.liquidity === "healthy" && context.expectedR >= 1.7 && context.priceSnapshot.ageMs < 3_000;
  const direction = context.regime.trend === "bullish" ? "long" : context.regime.trend === "bearish" ? "short" : "none";
  const strength = clamp(0, 100, aligned ? 82 + context.catalystScore * 0.1 : 35);
  const confidence = clamp(0, 100, aligned ? 86 + (context.whaleScore > 8 ? 4 : 0) : 20);
  return {
    symbol: context.symbol,
    market: context.market,
    direction,
    strength,
    confidence,
    timestamp: context.priceSnapshot.tsReceived,
    features: {
      structure: clamp(0, 100, context.structure.score * 5),
      momentum: context.momentumScore,
      volume: clamp(0, 100, context.volume.anomalyScore * 5),
      volatility: context.regime.volatility === "normal" ? 74 : 44,
      trend: context.regime.trend === "neutral" ? 38 : 82,
      derivatives: clamp(0, 100, context.derivativesScore * 6),
    },
    meta: {
      sourceModel: "high_confidence_filter",
      candleTimeframe: "1m",
      dataQuality: context.priceSnapshot.freshness === "GOOD" ? "healthy" : "stale",
    },
  };
}
