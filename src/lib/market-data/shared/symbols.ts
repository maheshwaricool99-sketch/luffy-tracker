import { isBinanceRestrictionError, requestJson, requestText } from "./http";
import type { MarketId, MarketSymbolInfo } from "./types";

type CacheEntry = {
  expiresAt: number;
  items: MarketSymbolInfo[];
};

const cache = new Map<MarketId, CacheEntry>();
const TTL_MS = 30 * 60_000;

function dedupe(items: MarketSymbolInfo[]) {
  const map = new Map<string, MarketSymbolInfo>();
  for (const item of items) {
    map.set(item.symbol, item);
  }
  return [...map.values()];
}

function parsePipeTable(text: string, mapLine: (columns: string[]) => MarketSymbolInfo | null) {
  return text
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split("|").map((col) => col.trim()))
    .map(mapLine)
    .filter((item): item is MarketSymbolInfo => Boolean(item));
}

async function fetchCryptoUniverse(): Promise<MarketSymbolInfo[]> {
  try {
    const data = await requestJson<{
      symbols: Array<{ symbol: string; pair: string; contractType: string; quoteAsset: string; status: string; baseAsset: string }>;
    }>("https://fapi.binance.com/fapi/v1/exchangeInfo", { retries: 2 });

    const items = data.symbols
      .filter((item) => item.contractType === "PERPETUAL" && item.quoteAsset === "USDT" && item.status === "TRADING")
      .map((item) => ({
        symbol: item.symbol,
        marketId: "crypto" as const,
        name: item.baseAsset,
        currency: "USDT" as const,
      }));

    if (items.length > 0) return dedupe(items);
  } catch (error) {
    if (!isBinanceRestrictionError(error)) {
      // Continue to explicit fallback providers for any upstream failure.
    }
  }

  try {
    const okx = await requestJson<{ data: Array<{ instId: string; settleCcy: string; state: string; ctType?: string }> }>(
      "https://www.okx.com/api/v5/public/instruments?instType=SWAP",
      { retries: 2 },
    );
    const items = okx.data
      .filter((item) => item.settleCcy === "USDT" && item.state === "live")
      .map((item) => {
        const normalized = item.instId.replace(/-SWAP$/, "").replace(/-/g, "");
        return {
          symbol: normalized,
          marketId: "crypto" as const,
          name: normalized.replace(/USDT$/, ""),
          currency: "USDT" as const,
        };
      });
    if (items.length > 0) return dedupe(items);
  } catch {
    // Continue to CoinGecko fallback.
  }

  const coingecko = await requestJson<Array<{ symbol: string; name: string }>>(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false",
    { retries: 2 },
  );

  const items = coingecko
    .map((item) => item.symbol?.toUpperCase())
    .filter((symbol): symbol is string => Boolean(symbol))
    .map((symbol, index) => ({
      symbol: `${symbol}USDT`,
      marketId: "crypto" as const,
      name: coingecko[index]?.name ?? symbol,
      currency: "USDT" as const,
    }));

  return dedupe(items);
}

async function fetchUsUniverse(): Promise<MarketSymbolInfo[]> {
  const [nasdaqListed, otherListed] = await Promise.all([
    requestText("https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt", { retries: 2 }),
    requestText("https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt", { retries: 2 }),
  ]);

  const nasdaqItems = parsePipeTable(nasdaqListed, (cols) => {
    const symbol = cols[0];
    const name = cols[1];
    const testIssue = cols[6];
    if (!symbol || symbol === "File Creation Time" || testIssue === "Y") return null;
    return { symbol, marketId: "us", name, currency: "USD", benchmark: "SPY" };
  });

  const otherItems = parsePipeTable(otherListed, (cols) => {
    const symbol = cols[0];
    const name = cols[1];
    const testIssue = cols[4];
    if (!symbol || symbol === "File Creation Time" || testIssue === "Y") return null;
    return { symbol, marketId: "us", name, currency: "USD", benchmark: "SPY" };
  });

  return dedupe([...nasdaqItems, ...otherItems]);
}

async function fetchIndiaUniverse(): Promise<MarketSymbolInfo[]> {
  const nseCsv = await requestText("https://archives.nseindia.com/content/equities/EQUITY_L.csv", { retries: 2 });
  const lines = nseCsv.trim().split(/\r?\n/);
  const header = lines.shift()?.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")) ?? [];
  const symbolIndex = header.findIndex((cell) => cell.toUpperCase() === "SYMBOL");
  const nameIndex = header.findIndex((cell) => cell.toUpperCase().includes("NAME OF COMPANY"));

  const items = lines
    .map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")))
    .map((cols) => {
      const symbol = cols[symbolIndex];
      const name = cols[nameIndex];
      if (!symbol || !name) return null;
      return {
        symbol,
        marketId: "india" as const,
        name,
        currency: "INR" as const,
        benchmark: "NIFTY",
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return dedupe(items);
}

async function loadUniverse(marketId: MarketId) {
  if (marketId === "crypto") return fetchCryptoUniverse();
  if (marketId === "us") return fetchUsUniverse();
  return fetchIndiaUniverse();
}

export async function getMarketUniverse(marketId: MarketId): Promise<MarketSymbolInfo[]> {
  const cached = cache.get(marketId);
  if (cached && cached.expiresAt > Date.now()) return cached.items;
  const items = await loadUniverse(marketId);
  cache.set(marketId, { expiresAt: Date.now() + TTL_MS, items });
  return items;
}

export async function getSymbolInfo(symbol: string, marketId: MarketId): Promise<MarketSymbolInfo | null> {
  const items = await getMarketUniverse(marketId);
  return items.find((item) => item.symbol === symbol) ?? null;
}

export function primeMarketUniverse(marketId: MarketId, items: MarketSymbolInfo[]) {
  cache.set(marketId, { expiresAt: Date.now() + TTL_MS, items });
}

export function clearMarketUniverseCache() {
  cache.clear();
}
