/**
 * RANKING SERVICE
 *
 * Computes finalRankScore for each candidate before risk evaluation.
 * Higher score = higher priority for slot allocation and conflict resolution.
 *
 * Components (weights sum to 1.0):
 *   - confidence       0.25  — engine's stated confidence (0–100)
 *   - netEdgeR         0.20  — expected edge ratio (0–2+ clamped to 2)
 *   - strategyScore    0.15  — raw engine score (0–200, normalised to 0–100)
 *   - freshness        0.15  — how recently the candidate was created vs its TTL
 *   - winRate          0.15  — historical win rate for this engine+setupType (0–1)
 *   - avgRR            0.10  — historical avg R:R for this engine+setupType (0–3 clamped)
 */

import type { Candidate } from "./types";

// ── Historical performance cache ──────────────────────────────────────────────
// Populated externally (e.g. from DB or trade-store analysis).
// Key: `${engineId}:${setupType}`

type PerfEntry = {
  winRate: number;   // 0–1
  avgRR: number;     // 0–3+
  sampleSize: number;
};

const _perfCache = new Map<string, PerfEntry>();

export function updatePerfCache(engineId: string, setupType: string, entry: PerfEntry): void {
  _perfCache.set(`${engineId}:${setupType}`, entry);
}

function getPerfEntry(engineId: string, setupType: string): PerfEntry {
  return _perfCache.get(`${engineId}:${setupType}`) ?? { winRate: 0.5, avgRR: 1.0, sampleSize: 0 };
}

// ── Scoring ───────────────────────────────────────────────────────────────────

const W = {
  confidence:    0.25,
  netEdgeR:      0.20,
  strategyScore: 0.15,
  freshness:     0.15,
  winRate:       0.15,
  avgRR:         0.10,
} as const;

/**
 * Compute finalRankScore (0–100) for a candidate.
 * Attaches the result and breakdown to candidate in-place.
 */
export function rankCandidate(candidate: Candidate): number {
  const now = Date.now();

  // 1. Confidence: 0–100 → 0–1
  const confScore = Math.min(100, Math.max(0, candidate.confidence)) / 100;

  // 2. netEdgeR: 0–2 clamped → 0–1
  const edgeScore = Math.min(2, Math.max(0, candidate.netEdgeR)) / 2;

  // 3. strategyScore: 0–200 clamped → 0–1
  const stratScore = Math.min(200, Math.max(0, candidate.strategyScore)) / 200;

  // 4. Freshness: linear decay over the candidate's lifetime
  //    1.0 = just created, 0.0 = at expiry
  const totalLifeMs = candidate.candidateExpiryAtMs - candidate.candidateCreatedAtMs;
  const ageMs = now - candidate.candidateCreatedAtMs;
  const freshnessScore = totalLifeMs > 0
    ? Math.max(0, 1 - ageMs / totalLifeMs)
    : 0;

  // 5 & 6. Historical performance
  const perf = getPerfEntry(candidate.sourceEngine, candidate.setupType);
  const winRateScore = Math.min(1, Math.max(0, perf.winRate));
  const avgRRScore   = Math.min(3, Math.max(0, perf.avgRR)) / 3;

  // Weighted sum → 0–1
  const raw =
    W.confidence    * confScore    +
    W.netEdgeR      * edgeScore    +
    W.strategyScore * stratScore   +
    W.freshness     * freshnessScore +
    W.winRate       * winRateScore +
    W.avgRR         * avgRRScore;

  // Scale to 0–100, round to 2dp
  const finalRankScore = Math.round(raw * 100 * 100) / 100;

  candidate.finalRankScore = finalRankScore;
  candidate.rankingBreakdown = {
    confidence:    Math.round(confScore     * W.confidence    * 100 * 100) / 100,
    netEdgeR:      Math.round(edgeScore     * W.netEdgeR      * 100 * 100) / 100,
    strategyScore: Math.round(stratScore    * W.strategyScore * 100 * 100) / 100,
    freshness:     Math.round(freshnessScore * W.freshness    * 100 * 100) / 100,
    winRate:       Math.round(winRateScore  * W.winRate       * 100 * 100) / 100,
    avgRR:         Math.round(avgRRScore    * W.avgRR         * 100 * 100) / 100,
  };

  return finalRankScore;
}

/**
 * Rank and sort an array of candidates (highest score first).
 */
export function rankAndSort(candidates: Candidate[]): Candidate[] {
  candidates.forEach(rankCandidate);
  return [...candidates].sort((a, b) => (b.finalRankScore ?? 0) - (a.finalRankScore ?? 0));
}
