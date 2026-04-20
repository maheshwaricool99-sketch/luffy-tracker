import { clamp } from "@/lib/market-data/shared/utils";
import type { ModelOutput, SignalFeatureContext } from "@/lib/signals/signal-types";

export function runBreakoutModel(context: SignalFeatureContext): ModelOutput {
  const direction = context.structure.trendShift > 0 ? "long" : "short";
  const breakoutBias = context.structure.equalZoneHits >= 3 ? 74 : 58;
  const strength = clamp(0, 100, breakoutBias + context.volume.anomalyScore + (Math.abs(context.structure.movePct) < 5 ? 10 : -12));
  const confidence = clamp(0, 100, (strength * 0.62) + (context.regime.liquidity === "healthy" ? 18 : 6));
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
      volatility: context.regime.volatility === "low" ? 72 : context.regime.volatility === "normal" ? 64 : 32,
      trend: context.regime.trend === "bullish" || context.regime.trend === "bearish" ? 70 : 42,
      derivatives: clamp(0, 100, context.derivativesScore * 6),
    },
    meta: {
      sourceModel: "breakout_model",
      candleTimeframe: "1m",
      dataQuality: context.priceSnapshot.freshness === "GOOD" ? "healthy" : "stale",
    },
  };
}
