/**
 * CATALYST SIGNALS — ISOLATED CACHE
 *
 * ISOLATION GUARANTEE:
 *   Fully isolated from trading engine caches. Uses its own in-memory store
 *   with a separate namespace. Never shares state with any trading module.
 *
 * Design:
 *   - Simple key-value TTL cache
 *   - Runs only within the catalyst module namespace
 *   - No filesystem writes (keeps catalyst footprint near zero)
 *   - Thread-safe for single-process Node.js (no concurrent mutation issues)
 */

import { CACHE_TTL_MS } from "./config";

type CacheEntry<T> = {
  value: T;
  expiresAtMs: number;
};

class CatalystCache {
  private readonly _store = new Map<string, CacheEntry<unknown>>();
  private readonly _namespace = "catalyst";

  private _key(key: string): string {
    return `${this._namespace}:${key}`;
  }

  get<T>(key: string): T | null {
    const entry = this._store.get(this._key(key)) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAtMs) {
      this._store.delete(this._key(key));
      return null;
    }
    return entry.value;
  }

  set<T>(key: string, value: T, ttlMs = CACHE_TTL_MS): void {
    this._store.set(this._key(key), {
      value,
      expiresAtMs: Date.now() + ttlMs,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this._store.delete(this._key(key));
  }

  /** Remove all expired entries (call periodically to prevent memory growth) */
  sweep(): void {
    const now = Date.now();
    for (const [k, entry] of this._store) {
      if (now > entry.expiresAtMs) this._store.delete(k);
    }
  }

  clear(): void {
    this._store.clear();
  }

  /** Diagnostic — number of live entries */
  size(): number {
    this.sweep();
    return this._store.size;
  }
}

/** Singleton cache instance — isolated within the catalyst module */
export const catalystCache = new CatalystCache();

// ── Cache key constants ───────────────────────────────────────────────────────
export const CACHE_KEYS = {
  SIGNALS_RESULT:  "signals:result",
  STOCKS_RAW:      "raw:stocks",
  CRYPTO_RAW:      "raw:crypto",
  NEWS_RAW:        "raw:news",
  SOCIAL_RAW:      "raw:social",
} as const;
