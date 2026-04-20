type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = globalThis.__providerCacheStore ?? new Map<string, CacheEntry<unknown>>();
const inflight = globalThis.__providerInflightStore ?? new Map<string, Promise<unknown>>();

declare global {
  var __providerCacheStore: Map<string, CacheEntry<unknown>> | undefined;
  var __providerInflightStore: Map<string, Promise<unknown>> | undefined;
}

if (!globalThis.__providerCacheStore) globalThis.__providerCacheStore = store;
if (!globalThis.__providerInflightStore) globalThis.__providerInflightStore = inflight;

export function getCacheValue<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCacheValue<T>(key: string, value: T, ttlMs: number) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export async function dedupeInflight<T>(key: string, work: () => Promise<T>) {
  const active = inflight.get(key);
  if (active) return active as Promise<T>;
  const promise = work().finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

export function resetProviderCacheForTests() {
  store.clear();
  inflight.clear();
}
