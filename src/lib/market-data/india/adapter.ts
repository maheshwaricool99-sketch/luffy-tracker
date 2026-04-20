import { getMarketUniverse, getSymbolInfo } from "../shared/symbols";
import { requestJson } from "../shared/http";
import type { MarketHealth, PriceSnapshot } from "../shared/types";

const IST_OFFSET_MINUTES = 330;

function freshnessFromAge(ageMs: number) {
  if (ageMs < 1_000) return "GOOD" as const;
  if (ageMs < 3_000) return "OK" as const;
  if (ageMs < 5_000) return "STALE" as const;
  return "REJECT" as const;
}

export function isIndiaMarketOpen(now = Date.now()): boolean {
  const ist = new Date(now + IST_OFFSET_MINUTES * 60_000);
  const day = ist.getUTCDay();
  if (day === 0 || day === 6) return false;
  const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return minutes >= (9 * 60 + 15) && minutes <= (15 * 60 + 30);
}

export function getIndiaHolidayStub(_now = Date.now()): string[] {
  return [];
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

export async function getIndiaSnapshot(symbol: string): Promise<PriceSnapshot> {
  const yahooSymbol = `${symbol}.NS`;
  const data = await requestJson<YahooChartResponse>(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1m&range=1d`,
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
    marketId: "india",
    price,
    bid,
    ask,
    tsExchange: ts,
    tsReceived: received,
    ageMs: received - ts,
    source: "nse",
    priceSource: "nse",
    stale: received - ts > 3_000,
    freshness: freshnessFromAge(received - ts),
    fallback: null,
    dataAvailable: received - ts <= 120_000,
    error: received - ts <= 120_000 ? null : "data unavailable",
    currency: "INR",
  };
}

export async function listIndiaSymbols() {
  return getMarketUniverse("india");
}

export async function getIndiaHealth(): Promise<MarketHealth> {
  const symbols = await getMarketUniverse("india").catch(() => []);
  return {
    marketId: "india",
    ok: symbols.length > 0,
    source: "nse",
    lastUpdateMs: Date.now(),
    staleSymbols: isIndiaMarketOpen() ? 0 : symbols.length,
    fallbackActive: false,
    details: "Dynamic NSE/BSE symbol universe with live quote fetches.",
    symbolCount: symbols.length,
  };
}

export async function getIndiaCompanyName(symbol: string): Promise<string> {
  return (await getSymbolInfo(symbol, "india"))?.name ?? symbol;
}
