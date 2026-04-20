/**
 * CATALYST SIGNALS — CONFIGURATION
 *
 * ISOLATION GUARANTEE: No trading module imports.
 * Adjust constants here without touching any engine/execution code.
 */

/** In-process cache TTL for fetched provider data (ms) */
export const CACHE_TTL_MS = 5 * 60_000; // 5 minutes

/** Background refresh interval — does not block page render */
export const BACKGROUND_REFRESH_MS = 4 * 60_000; // 4 minutes

/** How many top signals to include in API response */
export const TOP_SIGNALS_COUNT = 25;

/** Maximum candidates to process per pipeline run */
export const MAX_CANDIDATES = 150;

/** Minimum signal score required to surface a signal */
export const MIN_SIGNAL_SCORE = 12;

/** Provider fetch timeout (ms) — never blocks the app */
export const PROVIDER_TIMEOUT_MS = 8_000;

/** Max age for a signal to appear in "recent" results (ms) */
export const RECENT_SIGNAL_MAX_AGE_MS = 24 * 60 * 60_000; // 24h

/**
 * Score component weights — must sum to 1.0.
 *
 * Rationale (pre-pump detection focus):
 *  - prePumpVolumeScore is the PRIMARY leading indicator: elevated volume with
 *    flat/small price change signals accumulation BEFORE the move happens.
 *    It scores ZERO if price has already spiked > 30%, ensuring we surface
 *    opportunities early, not after the crowd has already entered.
 *  - keywordStrengthScore captures the narrative catalyst that often precedes moves.
 *  - relativeVolumeScore rewards raw volume anomalies (institutional/whale activity).
 *  - mentionsSpikeScore catches social momentum building before it's priced in.
 *  - priceSpikeScore is intentionally zeroed out — a large price move means you're
 *    already late; it's kept in the breakdown for display only.
 */
export const SCORE_WEIGHTS = {
  prePumpVolumeScore:         0.30,  // LEADING — high vol + flat price = accumulation phase
  keywordStrengthScore:       0.22,  // LEADING — news/narrative catalyst
  relativeVolumeScore:        0.18,  // LEADING — raw volume anomaly
  mentionsSpikeScore:         0.12,  // LEADING — social momentum building
  sourceCredibilityScore:     0.08,  // quality — confirms catalyst is real
  sentimentScore:             0.05,  // bullish sentiment
  freshnessScore:             0.05,  // signal age decay
  priceSpikeScore:            0.00,  // LAGGING — zero weight (already moved = too late)
  floatOrVolatilityRiskScore: 0.00,  // removed — not a predictor
} as const satisfies Record<string, number>;

// Verify weights sum to 1 at module load (compile-time check via assertion below)
const _weightSum = Object.values(SCORE_WEIGHTS).reduce<number>((a, b) => a + b, 0);
if (Math.abs(_weightSum - 1.0) > 0.001) {
  throw new Error(`[CatalystConfig] SCORE_WEIGHTS must sum to 1.0, got ${_weightSum}`);
}

/** Credibility scores for known headline sources */
export const SOURCE_CREDIBILITY_MAP: Record<string, number> = {
  // Tier 1 — official filings, major wires
  "sec.gov":          100,
  "businesswire":     95,
  "prnewswire":       95,
  "globe newswire":   92,
  "businesswire.com": 95,
  "accesswire":       88,
  // Tier 2 — major financial media
  "bloomberg":        90,
  "reuters":          90,
  "wsj":              88,
  "ft":               88,
  "cnbc":             82,
  "barrons":          82,
  "marketwatch":      78,
  // Tier 3 — crypto/finance specialty
  "coindesk":         78,
  "cointelegraph":    72,
  "theblock":         78,
  "decrypt":          70,
  "benzinga":         68,
  "seekingalpha":     62,
  "yahoo finance":    60,
  // Tier 4 — blogs / social
  "twitter":          30,
  "reddit":           25,
  "stocktwits":       20,
  "telegram":         18,
  "unknown":          15,
};

export function sourceCredibilityScore(sourceName: string): number {
  const lower = sourceName.toLowerCase();
  for (const [key, score] of Object.entries(SOURCE_CREDIBILITY_MAP)) {
    if (lower.includes(key)) return score;
  }
  return 20; // default for unknown sources
}
