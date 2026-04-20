import { getMarketUniverse, getSymbolInfo } from "../shared/symbols";
import { requestJson } from "../shared/http";
import type { MarketHealth, PriceSnapshot } from "../shared/types";

function freshnessFromAge(ageMs: number) {
  if (ageMs < 1_000) return "GOOD" as const;
  if (ageMs < 3_000) return "OK" as const;
  if (ageMs < 5_000) return "STALE" as const;
  return "REJECT" as const;
}

const YAHOO_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        regularMarketTime?: number;
        bid?: number;
        ask?: number;
      };
    }>;
  };
};

export async function getUsSnapshot(symbol: string): Promise<PriceSnapshot> {
  const data = await requestJson<YahooChartResponse>(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`,
    { retries: 2, headers: { "User-Agent": YAHOO_UA } },
  );
  const meta = data.chart?.result?.[0]?.meta;
  const received = Date.now();
  const ts = Number((meta?.regularMarketTime ?? Math.floor(received / 1000)) * 1000);
  const price = Number(meta?.regularMarketPrice ?? 0);
  if (!Number.isFinite(price) || price <= 0) throw new Error(`data unavailable for ${symbol}`);
  const bid = Number(meta?.bid ?? price);
  const ask = Number(meta?.ask ?? price);
  return {
    symbol,
    marketId: "us",
    price,
    bid,
    ask,
    tsExchange: ts,
    tsReceived: received,
    ageMs: received - ts,
    source: "yahoo",
    priceSource: "yahoo",
    stale: received - ts > 3_000,
    freshness: freshnessFromAge(received - ts),
    fallback: null,
    dataAvailable: received - ts <= 120_000,
    error: received - ts <= 120_000 ? null : "data unavailable",
    currency: "USD",
  };
}

export async function listUsSymbols() {
  return getMarketUniverse("us");
}

export async function getUsHealth(): Promise<MarketHealth> {
  const symbols = await getMarketUniverse("us").catch(() => []);
  return {
    marketId: "us",
    ok: symbols.length > 0,
    source: "yahoo",
    lastUpdateMs: Date.now(),
    staleSymbols: 0,
    fallbackActive: false,
    details: "Dynamic US tradable universe with live quote fetches.",
    symbolCount: symbols.length,
  };
}

export async function getUsCompanyName(symbol: string): Promise<string> {
  return (await getSymbolInfo(symbol, "us"))?.name ?? symbol;
}
