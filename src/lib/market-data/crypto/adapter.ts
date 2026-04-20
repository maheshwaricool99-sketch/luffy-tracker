import { getUnifiedPrice } from "@/lib/price-engine";
import { getMarketUniverse } from "../shared/symbols";
import { isBinanceRestrictionError, requestJson } from "../shared/http";
import type { MarketHealth, PriceSnapshot } from "../shared/types";

function freshnessFromAge(ageMs: number) {
  if (ageMs < 1_000) return "GOOD" as const;
  if (ageMs < 3_000) return "OK" as const;
  if (ageMs < 5_000) return "STALE" as const;
  return "REJECT" as const;
}

function toOkxInstId(symbol: string) {
  const base = symbol.replace(/USDT$/, "");
  return `${base}-USDT-SWAP`;
}

async function fetchBinanceTicker(symbol: string): Promise<PriceSnapshot> {
  const data = await requestJson<{ bidPrice: string; askPrice: string; time?: number }>(
    `https://fapi.binance.com/fapi/v1/ticker/bookTicker?symbol=${symbol}`,
    { retries: 2 },
  );
  const received = Date.now();
  const bid = Number(data.bidPrice);
  const ask = Number(data.askPrice);
  const price = (bid + ask) / 2;
  return {
    symbol,
    marketId: "crypto",
    price,
    bid,
    ask,
    tsExchange: Number(data.time ?? received),
    tsReceived: received,
    ageMs: received - Number(data.time ?? received),
    source: "binance",
    priceSource: "binance",
    stale: false,
    freshness: freshnessFromAge(received - Number(data.time ?? received)),
    fallback: null,
    dataAvailable: Number.isFinite(price) && price > 0,
    error: null,
    currency: "USDT",
  };
}

async function fetchOkxTicker(symbol: string): Promise<PriceSnapshot> {
  const data = await requestJson<{ data: Array<{ last: string; bidPx: string; askPx: string; ts: string }> }>(
    `https://www.okx.com/api/v5/market/ticker?instId=${toOkxInstId(symbol)}`,
    { retries: 2 },
  );
  const row = data.data[0];
  const received = Date.now();
  const ts = Number(row?.ts ?? received);
  return {
    symbol,
    marketId: "crypto",
    price: Number(row?.last ?? 0),
    bid: Number(row?.bidPx ?? row?.last ?? 0),
    ask: Number(row?.askPx ?? row?.last ?? 0),
    tsExchange: ts,
    tsReceived: received,
    ageMs: received - ts,
    source: "okx",
    priceSource: "okx",
    stale: false,
    freshness: freshnessFromAge(received - ts),
    fallback: "binance",
    dataAvailable: Number(row?.last ?? 0) > 0,
    error: null,
    currency: "USDT",
  };
}

async function fetchCoinGeckoTicker(symbol: string): Promise<PriceSnapshot> {
  const base = symbol.replace(/USDT$/, "").toLowerCase();
  const data = await requestJson<Array<{ current_price: number; last_updated?: string }>>(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&symbols=${base}`,
    { retries: 2 },
  );
  const row = data[0];
  const received = Date.now();
  const ts = row?.last_updated ? Date.parse(row.last_updated) : received;
  return {
    symbol,
    marketId: "crypto",
    price: Number(row?.current_price ?? 0),
    bid: Number(row?.current_price ?? 0),
    ask: Number(row?.current_price ?? 0),
    tsExchange: ts,
    tsReceived: received,
    ageMs: received - ts,
    source: "coingecko",
    priceSource: "coingecko",
    stale: false,
    freshness: freshnessFromAge(received - ts),
    fallback: "okx",
    dataAvailable: Number(row?.current_price ?? 0) > 0,
    error: null,
    currency: "USDT",
  };
}

export async function getCryptoSnapshot(symbol: string): Promise<PriceSnapshot> {
  const live = await getUnifiedPrice(symbol).catch(() => null);
  if (live && live.price > 0 && live.ageMs < 5_000) {
    return {
      symbol,
      marketId: "crypto",
      price: live.price,
      bid: live.price,
      ask: live.price,
      tsExchange: live.timestamp,
      tsReceived: live.timestamp,
      ageMs: live.ageMs,
      source: live.source.includes("okx") ? "okx" : live.source.includes("coin") ? "coingecko" : "binance",
      priceSource: live.source.includes("okx") ? "okx" : live.source.includes("coin") ? "coingecko" : "binance",
      stale: live.ageMs > 3_000,
      freshness: freshnessFromAge(live.ageMs),
      fallback: null,
      dataAvailable: true,
      error: null,
      currency: "USDT",
    };
  }

  try {
    const binance = await fetchBinanceTicker(symbol);
    if (binance.dataAvailable && binance.ageMs <= 5_000) return binance;
  } catch (error) {
    if (!isBinanceRestrictionError(error)) {
      // continue through explicit fallback chain
    }
  }

  try {
    const okx = await fetchOkxTicker(symbol);
    if (okx.dataAvailable && okx.ageMs <= 5_000) return okx;
  } catch {
    // continue
  }

  const coingecko = await fetchCoinGeckoTicker(symbol);
  if (!coingecko.dataAvailable || coingecko.ageMs > 5_000) {
    throw new Error(`data unavailable for ${symbol}`);
  }
  return coingecko;
}

export async function listCryptoSymbols() {
  return getMarketUniverse("crypto");
}

export async function getCryptoHealth(): Promise<MarketHealth> {
  const symbols = await getMarketUniverse("crypto").catch(() => []);
  return {
    marketId: "crypto",
    ok: symbols.length > 0,
    source: "binance->okx->coingecko",
    lastUpdateMs: Date.now(),
    staleSymbols: 0,
    fallbackActive: false,
    details: "Dynamic crypto universe with explicit provider fallback chain.",
    symbolCount: symbols.length,
  };
}
