import { nowMs } from "@/lib/market-data/core/time";
import type { MarketDataPoint, ProviderFetchResult } from "@/lib/market-data/core/types";

export function successResult<T>(provider: string, data: T, latencyMs: number, isFallback = false): ProviderFetchResult<T> {
  return {
    ok: true,
    provider,
    data,
    fetchedAtMs: nowMs(),
    latencyMs,
    isFallback,
  };
}

export function failureResult(provider: string, errorCode: string, errorMessage: string, latencyMs: number, isFallback = false): ProviderFetchResult<never> {
  return {
    ok: false,
    provider,
    errorCode,
    errorMessage,
    fetchedAtMs: nowMs(),
    latencyMs,
    isFallback,
  };
}

export function pointsFromPrices(provider: string, input: Array<{ symbol: string; price: number; timestampMs: number }>, isLive: boolean, isFallback: boolean): MarketDataPoint[] {
  return input.map((item) => ({
    symbol: item.symbol,
    price: item.price,
    timestampMs: item.timestampMs,
    source: provider,
    isLive,
    isFallback,
    providerName: provider,
    providerTimestampMs: item.timestampMs,
    receivedAtMs: nowMs(),
    ageMs: Math.max(0, nowMs() - item.timestampMs),
    latencyMs: 0,
    confidenceScore: isFallback ? 0.55 : isLive ? 0.96 : 0.8,
    sourceType: isFallback ? "cached_fallback" : provider.includes("ws") ? "primary_ws" : provider.includes("rest") ? "primary_rest" : "secondary_rest",
    degradeReason: isFallback ? "protected_fallback_snapshot" : null,
  }));
}
