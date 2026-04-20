export const USDT_PERP_PAIRS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "ADAUSDT",
] as const;

export const FUTURES_INTERVALS = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"] as const;

export type PerpPair = string;
export type FuturesInterval = (typeof FUTURES_INTERVALS)[number];

export const DEFAULT_PAIR = "BTCUSDT";
export const DEFAULT_INTERVAL: FuturesInterval = "4h";

export function normalizePair(pair: string | null | undefined): PerpPair {
  if (!pair) {
    return DEFAULT_PAIR;
  }

  const upper = pair.toUpperCase().trim();
  if (!upper.endsWith("USDT")) {
    return DEFAULT_PAIR;
  }
  if (!/^[A-Z0-9]{2,20}USDT$/.test(upper)) {
    return DEFAULT_PAIR;
  }
  return upper;
}

export function normalizeInterval(interval: string | null | undefined): FuturesInterval {
  if (!interval) {
    return DEFAULT_INTERVAL;
  }

  return (FUTURES_INTERVALS as readonly string[]).includes(interval)
    ? (interval as FuturesInterval)
    : DEFAULT_INTERVAL;
}
