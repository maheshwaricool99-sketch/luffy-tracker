import { requestJson } from "./http";
import type { MarketId } from "./types";

export type CandlePoint = {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function toOkxInstId(symbol: string) {
  const base = symbol.replace(/USDT$/, "");
  return `${base}-USDT-SWAP`;
}

async function fetchCryptoCandles(symbol: string, limit: number): Promise<CandlePoint[]> {
  try {
    const data = await requestJson<Array<[number, string, string, string, string, string]>>(
      `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=1m&limit=${Math.min(limit, 1000)}`,
      { retries: 2 },
    );
    return data.map((row) => ({
      ts: Number(row[0]),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
    }));
  } catch {
    try {
      const data = await requestJson<{ data: Array<[string, string, string, string, string, string, string, string, string]> }>(
        `https://www.okx.com/api/v5/market/candles?instId=${toOkxInstId(symbol)}&bar=1m&limit=${Math.min(limit, 300)}`,
        { retries: 2 },
      );
      return data.data.map((row) => ({
        ts: Number(row[0]),
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        volume: Number(row[5]),
      })).reverse();
    } catch {
      const base = symbol.replace(/USDT$/, "").toLowerCase();
      const data = await requestJson<{ prices: Array<[number, number]>; total_volumes: Array<[number, number]> }>(
        `https://api.coingecko.com/api/v3/coins/${base}/market_chart?vs_currency=usd&days=1&interval=minutely`,
        { retries: 2 },
      );
      return data.prices.slice(-limit).map((row, index) => {
        const prev = data.prices[Math.max(0, data.prices.length - limit + index - 1)] ?? row;
        const volume = data.total_volumes[Math.max(0, data.total_volumes.length - limit + index)]?.[1] ?? 0;
        return {
          ts: row[0],
          open: prev[1],
          high: Math.max(prev[1], row[1]),
          low: Math.min(prev[1], row[1]),
          close: row[1],
          volume,
        };
      });
    }
  }
}

async function fetchYahooCandles(symbol: string, marketId: Exclude<MarketId, "crypto">, limit: number): Promise<CandlePoint[]> {
  const yahooSymbol = marketId === "india" ? `${symbol}.NS` : symbol;
  const data = await requestJson<{
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: {
          quote?: Array<{
            open?: Array<number | null>;
            high?: Array<number | null>;
            low?: Array<number | null>;
            close?: Array<number | null>;
            volume?: Array<number | null>;
          }>;
        };
      }>;
    };
  }>(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1m&range=1d`, {
    retries: 2,
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" },
  });
  const row = data.chart?.result?.[0];
  const quote = row?.indicators?.quote?.[0];
  const ts = row?.timestamp ?? [];
  return ts.slice(-limit).map((value, index) => ({
    ts: value * 1000,
    open: Number(quote?.open?.[quote.open.length - ts.slice(-limit).length + index] ?? 0),
    high: Number(quote?.high?.[quote.high.length - ts.slice(-limit).length + index] ?? 0),
    low: Number(quote?.low?.[quote.low.length - ts.slice(-limit).length + index] ?? 0),
    close: Number(quote?.close?.[quote.close.length - ts.slice(-limit).length + index] ?? 0),
    volume: Number(quote?.volume?.[quote.volume.length - ts.slice(-limit).length + index] ?? 0),
  })).filter((item) => item.close > 0);
}

// Cache candles per symbol to avoid duplicate external HTTP requests (e.g. structure + volume
// services both call getCandles for the same symbol in the same pipeline tick).
const CANDLE_CACHE_TTL_MS = 120_000; // 2 min — candles change slowly; avoid re-fetching on every scan
const candleCache = new Map<string, { candles: CandlePoint[]; expiresAt: number }>();

// Evict expired entries every 5 minutes to prevent unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of candleCache) {
    if (entry.expiresAt < now) candleCache.delete(key);
  }
}, 5 * 60_000);

export async function getCandles(symbol: string, marketId: MarketId, limit = 36): Promise<CandlePoint[]> {
  const cacheKey = `${marketId}:${symbol}:${limit}`;
  const cached = candleCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.candles;

  const candles = marketId === "crypto"
    ? await fetchCryptoCandles(symbol, limit)
    : await fetchYahooCandles(symbol, marketId, limit);
  if (candles.length === 0) throw new Error(`data unavailable for ${marketId}:${symbol}`);

  candleCache.set(cacheKey, { candles, expiresAt: Date.now() + CANDLE_CACHE_TTL_MS });
  return candles;
}
