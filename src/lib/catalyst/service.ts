/**
 * CATALYST SIGNALS — PIPELINE SERVICE
 *
 * ISOLATION GUARANTEE:
 *   This module ONLY imports from within src/lib/catalyst/.
 *   It does NOT import from:
 *     - src/lib/trading/
 *     - src/lib/tracker-engine
 *     - src/lib/portfolio-state
 *     - src/lib/paper-exchange
 *     - src/lib/luffy-engine
 *     - any execution, order, or risk module
 *
 * Pipeline (read-only, no side effects on trading state):
 *   1. Fetch stock movers
 *   2. Fetch crypto movers
 *   3. Fetch news headlines
 *   4. Fetch social mentions
 *   5. Normalize all inputs → CatalystCandidate[]
 *   6. Attach keyword matches & headlines per candidate
 *   7. Score each candidate → CatalystSignal
 *   8. Filter by MIN_SIGNAL_SCORE
 *   9. Sort by signalScore descending
 *  10. Return top N signals + provider health
 */

import type { CatalystSignal, CatalystSignalsResponse, ProviderStatus } from "./types";
import { TOP_SIGNALS_COUNT, MIN_SIGNAL_SCORE } from "./config";
import { normalizeStockMover, normalizeCryptoMover } from "./normalizers";
import { buildCatalystSignal } from "./scoring";
import { catalystCache, CACHE_KEYS } from "./cache";
import { fetchStockMovers, liveStocksProvider } from "./sources/stocks";
import { fetchCryptoMovers, liveCryptoProvider } from "./sources/crypto";
import { fetchNewsHeadlines, stubNewsProvider } from "./sources/news";
import { fetchSocialMentions, stubSocialProvider } from "./sources/social";
import type { StocksProvider } from "./sources/stocks";
import type { CryptoProvider } from "./sources/crypto";
import type { NewsProvider } from "./sources/news";
import type { SocialProvider } from "./sources/social";

// ── Provider registry ─────────────────────────────────────────────────────────

/**
 * Inject real providers here when API keys become available.
 * Each provider is a simple object implementing the provider interface.
 */
const providers = {
  stocks: liveStocksProvider  as StocksProvider,
  crypto: liveCryptoProvider  as CryptoProvider,
  news:   stubNewsProvider    as NewsProvider,
  social: stubSocialProvider  as SocialProvider,
};

// ── Pipeline ──────────────────────────────────────────────────────────────────

/**
 * Run the full catalyst signal detection pipeline.
 *
 * Result is cached for CACHE_TTL_MS. Partial provider failures are tolerated
 * — the pipeline returns whatever data is available with degraded warnings.
 *
 * This function is safe to call on every API request; the cache prevents
 * expensive work from happening more than once per TTL window.
 */
export async function runCatalystPipeline(
  forceRefresh = false,
): Promise<CatalystSignalsResponse> {
  if (!forceRefresh) {
    const cached = catalystCache.get<CatalystSignalsResponse>(CACHE_KEYS.SIGNALS_RESULT);
    if (cached) return cached;
  }

  const nowMs = Date.now();
  const warnings: string[] = [];
  const providerStatuses: ProviderStatus[] = [];

  // Step 1-4: Fetch all sources in parallel (circuit-breaker inside each fetcher)
  const [stocksResult, cryptoResult, newsResult, socialResult] = await Promise.all([
    fetchStockMovers(providers.stocks, 30),
    fetchCryptoMovers(providers.crypto, 30),
    fetchNewsHeadlines(providers.news, 60),
    fetchSocialMentions(providers.social),
  ]);

  providerStatuses.push(
    stocksResult.status,
    cryptoResult.status,
    newsResult.status,
    socialResult.status,
  );

  if (!stocksResult.status.healthy) warnings.push("Stocks market data degraded — partial results");
  if (!cryptoResult.status.healthy) warnings.push("Crypto market data degraded — partial results");
  if (!newsResult.status.healthy)   warnings.push("News provider offline — keyword signals only");
  if (!socialResult.status.healthy) warnings.push("Social mentions provider offline — social scores unavailable");

  // Step 5-7: Normalize and score
  const candidates = [
    ...stocksResult.data.map((raw) =>
      normalizeStockMover(raw, newsResult.data, socialResult.data, nowMs),
    ),
    ...cryptoResult.data.map((raw) =>
      normalizeCryptoMover(raw, newsResult.data, socialResult.data, nowMs),
    ),
  ];

  const allSignals: CatalystSignal[] = candidates
    .map((c) => buildCatalystSignal(c, nowMs))
    .filter((s) => s.signalScore >= MIN_SIGNAL_SCORE)
    .sort((a, b) => b.signalScore - a.signalScore);

  // Step 8-10: Segment results
  const topSignals    = allSignals.slice(0, TOP_SIGNALS_COUNT);
  const recentSignals = allSignals; // all above threshold, for tab display

  const result: CatalystSignalsResponse = {
    timestamp:       nowMs,
    totalCandidates: candidates.length,
    topSignals,
    recentSignals,
    providerHealth:  providerStatuses,
    warnings,
    lastUpdated:     nowMs,
  };

  catalystCache.set(CACHE_KEYS.SIGNALS_RESULT, result);
  return result;
}

/**
 * Lightweight health check — returns provider statuses without running the
 * full pipeline (uses cached data if available).
 */
export function getCatalystHealth(): {
  cached: boolean;
  cacheEntries: number;
  providerHealth: ProviderStatus[];
} {
  const cached = catalystCache.get<CatalystSignalsResponse>(CACHE_KEYS.SIGNALS_RESULT);
  return {
    cached:         cached !== null,
    cacheEntries:   catalystCache.size(),
    providerHealth: cached?.providerHealth ?? [],
  };
}
