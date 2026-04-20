import { ema } from "@/lib/market-data/shared/utils";
import type { CandlePoint } from "@/lib/market-data/shared/candle-service";

export function getTrendRegime(candles: CandlePoint[]): "bullish" | "bearish" | "neutral" {
  const closes = candles.map((item) => item.close).filter((value) => value > 0);
  if (closes.length < 10) return "neutral";
  const fast = ema(closes.slice(-12), 5);
  const slow = ema(closes.slice(-24), 10);
  if (fast > slow * 1.002) return "bullish";
  if (fast < slow * 0.998) return "bearish";
  return "neutral";
}
