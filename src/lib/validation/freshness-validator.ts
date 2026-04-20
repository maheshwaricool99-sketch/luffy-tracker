import type { CandlePoint } from "@/lib/market-data/shared/candle-service";
import type { MarketId, PriceSnapshot } from "@/lib/market-data/shared/types";

const PRICE_AGE_LIMITS: Record<MarketId, number> = {
  crypto: 15_000,
  us: 120_000,
  india: 120_000,
};

const CANDLE_AGE_LIMITS: Record<MarketId, number> = {
  crypto: 5 * 60_000,
  us: 15 * 60_000,
  india: 15 * 60_000,
};

export function validateFreshness(snapshot: PriceSnapshot, candles: CandlePoint[]) {
  const candleAgeMs = candles.length > 0 ? Date.now() - candles[candles.length - 1].ts : Number.POSITIVE_INFINITY;
  const market = snapshot.marketId;
  const priceLimit = PRICE_AGE_LIMITS[market] ?? 15_000;
  const candleLimit = CANDLE_AGE_LIMITS[market] ?? 5 * 60_000;
  const snapshotRejected = snapshot.stale || snapshot.freshness === "REJECT" || snapshot.dataAvailable === false;
  return {
    ok: !snapshotRejected && snapshot.ageMs <= priceLimit && candleAgeMs <= candleLimit,
    priceAgeMs: snapshot.ageMs,
    candleAgeMs,
  };
}
