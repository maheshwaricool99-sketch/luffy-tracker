import { clamp } from "@/lib/market-data/shared/utils";
import type { ModelOutput, SignalFeatureContext } from "@/lib/signals/signal-types";

export function runContinuationModel(context: SignalFeatureContext): ModelOutput {
  const direction = context.regime.trend === "bullish" ? "long" : context.regime.trend === "bearish" ? "short" : "none";
  const trend = context.regime.trend === "neutral" ? 45 : 78;
  const strength = clamp(0, 100, trend + context.structure.score + (context.volume.ratio > 1 ? 6 : -4));
  const confidence = clamp(0, 100, (strength * 0.7) + (context.expectedR >= 1.7 ? 15 : 4));
  return {
    symbol: context.symbol,
    market: context.market,
    direction,
    strength,
    confidence,
    timestamp: context.priceSnapshot.tsReceived,
    features: {
      structure: clamp(0, 100, context.structure.score * 4),
      momentum: context.momentumScore,
      volume: clamp(0, 100, context.volume.anomalyScore * 5),
      volatility: context.regime.volatility === "normal" ? 70 : context.regime.volatility === "low" ? 55 : 38,
      trend,
      derivatives: clamp(0, 100, context.derivativesScore * 6),
    },
    meta: {
      sourceModel: "continuation_model",
      candleTimeframe: "1m",
      dataQuality: context.priceSnapshot.freshness === "GOOD" ? "healthy" : "stale",
    },
  };
}
