import type { MarketId } from "./types";
import { getCandles } from "./candle-service";
import { clamp, ema, pctChange, stdDev } from "./utils";

export async function getStructureMetrics(symbol: string, marketId: MarketId) {
  const candles = await getCandles(symbol, marketId, 36);
  const closes = candles.map((item) => item.close);
  const recent = closes.slice(-12);
  const compression = recent.length > 0 ? (stdDev(recent) / Math.max(recent[recent.length - 1] ?? 1, 1e-9)) * 100 : 0;
  const fast = ema(closes.slice(-8), 3);
  const slow = ema(closes.slice(-16), 8);
  const movePct = pctChange(closes[Math.max(0, closes.length - 16)] ?? closes[0] ?? 0, closes[closes.length - 1] ?? 0);
  const equalZoneHits = recent.filter((price) => Math.abs(price - (recent[recent.length - 1] ?? price)) / Math.max(price, 1e-9) < 0.0025).length;
  return {
    compressionPct: compression,
    trendShift: fast > slow ? 1 : -1,
    equalZoneHits,
    movePct,
    structureScore: Math.round(clamp(0, 20, (compression <= 1 ? 9 : 4) + Math.min(6, equalZoneHits) + (Math.abs(movePct) < 5 ? 5 : 1))),
  };
}
