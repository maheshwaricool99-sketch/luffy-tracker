import { getDb, nowIso } from "@/lib/db";
import { mapScannerStateToFreshness, mapScannerStateToSourceState, type Freshness, type SourceState } from "@/lib/freshness";
import type { PublishedSignal } from "@/lib/signals/signal-types";

export type ProductSignal = {
  id: string;
  symbol: string;
  market: string;
  direction: string;
  type: string;
  confidence: number;
  entry: number;
  stop: number;
  target: number;
  expectedR: number;
  freshness: Freshness;
  sourceState: SourceState;
  publishedAt: string;
  updatedAt: string;
  thesis: string | null;
  rationale: string[];
  supportingFactors: string[];
  invalidationRules: string[];
  lifecycleState: string;
  liveEligible: boolean;
  labels: string[];
};

export function toProductSignal(signal: PublishedSignal): ProductSignal | null {
  if (!signal.symbol || !signal.market || !signal.timestamp) return null;
  if (![signal.entry, signal.stopLoss, signal.takeProfit, signal.expectedR].every((value) => Number.isFinite(value))) return null;
  const freshness = mapScannerStateToFreshness(signal.sourceMeta.dataState, Boolean(signal.sourceMeta.restoredFromSnapshot));
  const sourceState = mapScannerStateToSourceState(signal.sourceMeta.dataState);
  const labels: string[] = [];

  if (freshness === "RESTORED_SNAPSHOT") labels.push("Restored snapshot");
  if (freshness === "STALE" || freshness === "UNAVAILABLE") labels.push("Suppressed from live views");

  return {
    id: signal.id,
    symbol: signal.symbol,
    market: signal.market,
    direction: signal.direction.toUpperCase(),
    type: signal.class,
    confidence: signal.confidence,
    entry: signal.entry,
    stop: signal.stopLoss,
    target: signal.takeProfit,
    expectedR: signal.expectedR,
    freshness,
    sourceState,
    publishedAt: new Date(signal.timestamp).toISOString(),
    updatedAt: new Date(signal.timestamp).toISOString(),
    thesis: signal.rationale[0] ?? null,
    rationale: signal.rationale,
    supportingFactors: [
      `Structure ${signal.scoreBreakdown.structure.toFixed(1)}`,
      `Momentum ${signal.scoreBreakdown.momentum.toFixed(1)}`,
      `Volume ${signal.scoreBreakdown.volume.toFixed(1)}`,
    ],
    invalidationRules: signal.invalidatesOn,
    lifecycleState: signal.lifecycleState,
    liveEligible: freshness === "LIVE" && sourceState === "LIVE_PROVIDER",
    labels,
  };
}

export function persistProductSignal(signal: ProductSignal) {
  const db = getDb();
  const now = nowIso();
  db.prepare(`
    INSERT INTO signal_records (
      id, symbol, market, direction, class, confidence, entry_value, stop_value, target_value, expected_r,
      freshness, source_state, published_at, updated_at, thesis, rationale_json, supporting_factors_json,
      invalidation_rules_json, lifecycle_state, meta_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      class = excluded.class,
      confidence = excluded.confidence,
      entry_value = excluded.entry_value,
      stop_value = excluded.stop_value,
      target_value = excluded.target_value,
      expected_r = excluded.expected_r,
      freshness = excluded.freshness,
      source_state = excluded.source_state,
      updated_at = excluded.updated_at,
      thesis = excluded.thesis,
      rationale_json = excluded.rationale_json,
      supporting_factors_json = excluded.supporting_factors_json,
      invalidation_rules_json = excluded.invalidation_rules_json,
      lifecycle_state = excluded.lifecycle_state,
      meta_json = excluded.meta_json
  `).run(
    signal.id,
    signal.symbol,
    signal.market,
    signal.direction,
    signal.type,
    signal.confidence,
    signal.entry,
    signal.stop,
    signal.target,
    signal.expectedR,
    signal.freshness,
    signal.sourceState,
    signal.publishedAt,
    now,
    signal.thesis,
    JSON.stringify(signal.rationale),
    JSON.stringify(signal.supportingFactors),
    JSON.stringify(signal.invalidationRules),
    signal.lifecycleState,
    JSON.stringify({ labels: signal.labels, liveEligible: signal.liveEligible }),
  );
}
