import type { PerformanceApiResponse } from "./types";

type CacheEntry = {
  expiresAt: number;
  payload: PerformanceApiResponse;
  generatedAt: number;
};

const cache = globalThis.__performanceCache ?? new Map<string, CacheEntry>();

declare global {
  var __performanceCache: Map<string, CacheEntry> | undefined;
}

if (!globalThis.__performanceCache) {
  globalThis.__performanceCache = cache;
}

export function getPerformanceCache(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry;
}

export function setPerformanceCache(key: string, payload: PerformanceApiResponse, ttlSec: number) {
  const generatedAt = Date.now();
  cache.set(key, {
    payload,
    generatedAt,
    expiresAt: generatedAt + ttlSec * 1000,
  });
  return generatedAt;
}
