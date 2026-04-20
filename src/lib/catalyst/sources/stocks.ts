/**
 * CATALYST SIGNALS — STOCKS MARKET DATA ADAPTER
 *
 * ISOLATION GUARANTEE: No imports from trading, execution, or portfolio modules.
 *
 * Live data: Yahoo Finance v8/finance/chart for a curated watchlist of
 * high-activity US equities. avgVolume derived from 20-day candle history.
 */

import type { ProviderStatus, RawStockMover } from "../types";
import { PROVIDER_TIMEOUT_MS } from "../config";

export interface StocksProvider {
  readonly name: string;
  fetchMovers(limit?: number): Promise<RawStockMover[]>;
}

function makeStatus(name: string, healthy: boolean, error?: string): ProviderStatus {
  const now = Date.now();
  return {
    name,
    healthy,
    lastSuccessMs: healthy ? now : 0,
    lastErrorMs:   healthy ? 0 : now,
    errorMessage:  error,
  };
}

const YAHOO_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

// Curated watchlist: liquid US equities known to generate catalyst signals.
const WATCHLIST = [
  { symbol: "NVDA",  name: "NVIDIA Corporation" },
  { symbol: "TSLA",  name: "Tesla" },
  { symbol: "MSFT",  name: "Microsoft" },
  { symbol: "AAPL",  name: "Apple" },
  { symbol: "META",  name: "Meta Platforms" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN",  name: "Amazon" },
  { symbol: "AMD",   name: "Advanced Micro Devices" },
  { symbol: "PLTR",  name: "Palantir Technologies" },
  { symbol: "MSTR",  name: "MicroStrategy" },
  { symbol: "SMCI",  name: "Super Micro Computer" },
  { symbol: "SOUN",  name: "SoundHound AI" },
  { symbol: "CLSK",  name: "CleanSpark" },
  { symbol: "INTC",  name: "Intel" },
  { symbol: "COIN",  name: "Coinbase" },
  { symbol: "HOOD",  name: "Robinhood" },
  { symbol: "RIOT",  name: "Riot Platforms" },
  { symbol: "MARA",  name: "Marathon Digital" },
  { symbol: "SOFI",  name: "SoFi Technologies" },
  { symbol: "UPST",  name: "Upstart" },
];

type YahooChartMeta = {
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  previousClose?: number;
  longName?: string;
};

async function fetchYahooQuote(symbol: string): Promise<{ price: number; changePct: number; volume: number; avgVolume: number } | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=30d`,
      {
        signal: AbortSignal.timeout(8_000),
        headers: { "User-Agent": YAHOO_UA },
      },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const meta: YahooChartMeta = result.meta ?? {};
    const price = meta.regularMarketPrice ?? 0;
    const changePct = meta.regularMarketChangePercent ?? 0;
    if (price <= 0) return null;

    // Derive avgVolume from 20-day history (more stable than single-day).
    const volumes: number[] = result.indicators?.quote?.[0]?.volume ?? [];
    const recent = volumes.filter((v) => v > 0).slice(-20);
    const avgVolume = recent.length > 0
      ? recent.reduce((s, v) => s + v, 0) / recent.length
      : meta.regularMarketVolume ?? 1;
    const volume = meta.regularMarketVolume ?? (recent.at(-1) ?? 0);

    return { price, changePct, volume, avgVolume: Math.max(avgVolume, 1) };
  } catch {
    return null;
  }
}

export const liveStocksProvider: StocksProvider = {
  name: "yahoo-finance-stocks",

  async fetchMovers(limit = 20): Promise<RawStockMover[]> {
    const targets = WATCHLIST.slice(0, limit);
    // Fetch concurrently but cap at 6 simultaneous to avoid rate limits.
    const results: RawStockMover[] = [];
    const CONCURRENCY = 6;
    for (let i = 0; i < targets.length; i += CONCURRENCY) {
      const batch = targets.slice(i, i + CONCURRENCY);
      const settled = await Promise.allSettled(
        batch.map(async ({ symbol, name }) => {
          const q = await fetchYahooQuote(symbol);
          if (!q) return null;
          return {
            symbol,
            name,
            price:     q.price,
            changePct: q.changePct,
            volume:    q.volume,
            avgVolume: q.avgVolume,
          } satisfies RawStockMover;
        }),
      );
      for (const r of settled) {
        if (r.status === "fulfilled" && r.value) results.push(r.value);
      }
    }
    return results;
  },
};

// ── Fetcher with circuit-breaker ──────────────────────────────────────────────

export async function fetchStockMovers(
  provider: StocksProvider = liveStocksProvider,
  limit = 20,
): Promise<{ data: RawStockMover[]; status: ProviderStatus }> {
  let timeoutId: NodeJS.Timeout | null = null;
  try {
    const data = await Promise.race([
      provider.fetchMovers(limit),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Stocks provider timeout")), PROVIDER_TIMEOUT_MS);
      }),
    ]);
    if (timeoutId) clearTimeout(timeoutId);
    return { data, status: makeStatus(provider.name, true) };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : "unknown error";
    console.warn(`[CatalystSignals/stocks] Provider "${provider.name}" failed: ${msg}`);
    return { data: [], status: makeStatus(provider.name, false, msg) };
  }
}
