import type { MarketId } from "./types";
import { getCandles } from "./candle-service";
import { average, clamp } from "./utils";

export async function getVolumeMetrics(symbol: string, marketId: MarketId) {
  const candles = await getCandles(symbol, marketId, 30);
  const recent = candles.slice(-5).map((item) => item.volume);
  const baseline = candles.slice(0, -5).map((item) => item.volume);
  const recentAvg = average(recent);
  const baselineAvg = average(baseline) || 1;
  const ratio = recentAvg / baselineAvg;
  return {
    ratio,
    anomalyScore: Math.round(clamp(0, 20, (ratio - 1) * 12)),
    recentAvg,
    baselineAvg,
  };
}
