import { clamp } from "@/lib/market-data/shared/utils";
import type { ModelOutput, SignalFeatureContext } from "@/lib/signals/signal-types";

export function runEarlyDetectionFilter(context: SignalFeatureContext): ModelOutput {
  const accumulation = context.structure.compressionPct <= 1.2 && context.volume.ratio > 1;
  const direction = context.structure.trendShift > 0 ? "long" : "short";
  const strength = clamp(0, 100, accumulation ? 76 + context.structure.equalZoneHits * 2 : 30);
  const confidence = clamp(0, 100, accumulation ? 74 + (Math.abs(context.structure.movePct) < 3 ? 8 : -10) : 24);
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
      volatility: context.regime.volatility === "low" ? 80 : 52,
      trend: context.regime.trend === "neutral" ? 58 : 70,
      derivatives: clamp(0, 100, context.derivativesScore * 5),
    },
    meta: {
      sourceModel: "early_detection_filter",
      candleTimeframe: "1m",
      dataQuality: context.priceSnapshot.freshness === "GOOD" ? "healthy" : "stale",
    },
  };
}
