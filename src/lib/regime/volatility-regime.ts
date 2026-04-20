import { average, stdDev } from "@/lib/market-data/shared/utils";
import type { CandlePoint } from "@/lib/market-data/shared/candle-service";

export function getVolatilityRegime(candles: CandlePoint[]): "low" | "normal" | "high" {
  if (candles.length < 10) return "normal";
  const ranges = candles.slice(-20).map((item) => Math.abs(item.high - item.low) / Math.max(item.close, 1e-9));
  const realized = average(ranges);
  const dispersion = stdDev(ranges);
  const score = realized + dispersion;
  if (score < 0.005) return "low";
  if (score > 0.018) return "high";
  return "normal";
}
