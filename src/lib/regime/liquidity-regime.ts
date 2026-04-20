import { average } from "@/lib/market-data/shared/utils";
import type { CandlePoint } from "@/lib/market-data/shared/candle-service";

export function getLiquidityRegime(candles: CandlePoint[], bid: number, ask: number): "healthy" | "weak" {
  const spreadPct = Math.abs(ask - bid) / Math.max((ask + bid) / 2, 1e-9);
  const avgVolume = average(candles.slice(-20).map((item) => item.volume));
  return spreadPct <= 0.004 && avgVolume > 0 ? "healthy" : "weak";
}
