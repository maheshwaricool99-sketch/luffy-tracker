import { getRecoveryController } from "../recovery/recovery-controller";
import { getProviderManager } from "../managers/provider-manager";
import { getPlatformHealthStatus } from "../health/platform-health";
import { getCryptoHealth, listCryptoSymbols } from "../crypto/adapter";
import { getIndiaHealth, listIndiaSymbols } from "../india/adapter";
import { getUsHealth, listUsSymbols } from "../us/adapter";
import { isPredictionEngineEnabled } from "./feature-flags";
import type { MarketHealth, MarketId, PriceSnapshot } from "./types";

const cache = new Map<string, PriceSnapshot>();

function getPriceAgeState(ageMs: number) {
  if (ageMs <= 3_000) return "LIVE_OK" as const;
  if (ageMs <= 10_000) return "SLIGHTLY_STALE" as const;
  if (ageMs <= 30_000) return "DEGRADED" as const;
  if (ageMs <= 90_000) return "FALLBACK_ONLY" as const;
  return "INVALID" as const;
}

function freshnessFromAge(ageMs: number) {
  if (ageMs <= 1_000) return "GOOD" as const;
  if (ageMs <= 3_000) return "OK" as const;
  if (ageMs <= 10_000) return "STALE" as const;
  return "REJECT" as const;
}

function confidenceFromPoint(ageMs: number, isFallback: boolean) {
  if (isFallback) {
    if (ageMs <= 15_000) return 0.62;
    if (ageMs <= 60_000) return 0.38;
    return 0.15;
  }
  if (ageMs <= 3_000) return 0.96;
  if (ageMs <= 10_000) return 0.82;
  if (ageMs <= 30_000) return 0.61;
  return 0.25;
}

function key(symbol: string, marketId: MarketId) {
  return `${marketId}:${symbol}`;
}

export async function getSnapshot(symbol: string, marketId: MarketId): Promise<PriceSnapshot> {
  getRecoveryController();
  const cacheKey = key(symbol, marketId);
  const cached = cache.get(cacheKey);
  const cacheTtlMs = marketId === "crypto" ? 2_000 : 30_000;
  if (cached && Date.now() - cached.tsReceived < cacheTtlMs) {
    const ageMs = Date.now() - cached.tsReceived;
    const ageState = getPriceAgeState(ageMs);
    return {
      ...cached,
      ageMs,
      ageState,
      stale: ageState !== "LIVE_OK",
      freshness: freshnessFromAge(ageMs),
      deliveryState: "cached",
      sourceType: cached.sourceType ?? "cached_fallback",
      confidenceScore: confidenceFromPoint(ageMs, true),
      degradeReason: ageState === "INVALID" ? "cached_snapshot_invalid" : "served_from_short_ttl_cache",
    };
  }

  try {
    const manager = getProviderManager(marketId);
    const [point] = await manager.fetchPrices([symbol]);
    if (!point) throw new Error(`data unavailable for ${marketId}:${symbol}`);
    const ageMs = Date.now() - point.timestampMs;
    const ageState = getPriceAgeState(ageMs);
    const maxAgeMs = marketId === "crypto" ? 5_000 : 120_000;
    const source = point.source.includes("okx") ? "okx" :
      point.source.includes("coinbase") ? "coingecko" :
      point.source.includes("kraken") ? "coingecko" :
      point.source.includes("bybit") ? "okx" :
      point.source.includes("binance") ? "binance" :
      point.source.includes("finnhub") ? "yahoo" :
      point.source.includes("alpha") ? "yahoo" :
      marketId === "india" ? "nse" :
      "yahoo";
    const snapshot: PriceSnapshot = {
      symbol,
      marketId,
      price: point.price,
      bid: point.price,
      ask: point.price,
      tsExchange: point.timestampMs,
      tsReceived: Date.now(),
      ageMs,
      source,
      priceSource: source,
      stale: ageState !== "LIVE_OK",
      freshness: freshnessFromAge(ageMs),
      deliveryState: point.isFallback ? "cached" : "live",
      fallback: point.isFallback ? point.source : null,
      sourceType: point.sourceType ?? (point.isFallback ? "cached_fallback" : "primary_rest"),
      providerName: point.providerName ?? point.source,
      providerTimestamp: point.providerTimestampMs ?? point.timestampMs,
      latencyMs: point.latencyMs,
      confidenceScore: point.confidenceScore ?? confidenceFromPoint(ageMs, point.isFallback),
      degradeReason: point.degradeReason ?? (ageState === "INVALID" ? "price_too_old" : point.isFallback ? "fallback_price_only" : null),
      ageState,
      dataAvailable: ageMs <= maxAgeMs && ageState !== "INVALID",
      error: ageMs <= maxAgeMs && ageState !== "INVALID" ? null : "data unavailable",
      currency: marketId === "crypto" ? "USDT" : marketId === "india" ? "INR" : "USD",
    };
    if (!snapshot.dataAvailable || snapshot.ageMs > maxAgeMs) {
      throw new Error(`data unavailable for ${marketId}:${symbol}`);
    }
    cache.set(cacheKey, snapshot);
    return { ...snapshot, deliveryState: "live" };
  } catch {
    throw new Error(`data unavailable for ${marketId}:${symbol}`);
  }
}

export function subscribe(symbol: string, marketId: MarketId, onTick?: (snapshot: PriceSnapshot) => void): () => void {
  let cancelled = false;
  const tick = async () => {
    if (cancelled) return;
    const snapshot = await getSnapshot(symbol, marketId);
    onTick?.(snapshot);
  };
  void tick();
  const timer = setInterval(() => void tick(), 1_000);
  return () => {
    cancelled = true;
    clearInterval(timer);
  };
}

export async function isFresh(symbol: string, marketId: MarketId): Promise<boolean> {
  const snapshot = await getSnapshot(symbol, marketId);
  return snapshot.dataAvailable && snapshot.ageMs < 3_000;
}

export async function getHealth(): Promise<{ enabled: boolean; markets: MarketHealth[] }> {
  getRecoveryController();
  const platform = getPlatformHealthStatus();
  const statuses = Object.fromEntries(platform.markets.map((market) => [market.market, market]));
  return {
    enabled: isPredictionEngineEnabled(),
    markets: (await Promise.all([getCryptoHealth(), getUsHealth(), getIndiaHealth()])).map((market) => {
      const runtime = statuses[market.marketId];
      return {
        ...market,
        ok: runtime ? runtime.statusLabel !== "Down" : market.ok,
        lastUpdateMs: runtime?.lastProviderSuccessMs ?? market.lastUpdateMs,
        fallbackActive: runtime?.snapshotActive ?? market.fallbackActive,
        details: runtime ? `${runtime.activeProviderId ?? "none"} · ${runtime.scanMode} scan · ${runtime.statusLabel}` : market.details,
      };
    }),
  };
}

export async function getMarketSymbols(marketId: MarketId) {
  if (marketId === "crypto") return listCryptoSymbols();
  if (marketId === "us") return listUsSymbols();
  return listIndiaSymbols();
}

export function clearPriceSnapshotCache() {
  cache.clear();
}
