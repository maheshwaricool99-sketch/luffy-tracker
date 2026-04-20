export const FRESHNESS_MS = {
  live_max: 30_000,
  delayed_max: 120_000,
} as const;

export const COVERAGE_PCT = {
  healthy_min: 90,
  reduced_min: 60,
  critical_min: 30,
} as const;

export const SCORE_WEIGHTS = {
  freshness: 0.30,
  dataIntegrity: 0.25,
  coverage: 0.20,
  executionReadiness: 0.10,
  macroStability: 0.10,
  providerQuality: 0.05,
} as const;

export const SCORE_PENALTIES = {
  stale_primary_market: 1.5,
  snapshot_market: 0.75,
  coverage_below_80: 1.0,
  scanner_stalled: 2.0,
  no_recent_signal_publish: 1.0,
  repeated_provider_reconnects: 0.5,
  engine_warming: 0.5,
  engine_restored: 1.0,
} as const;

export const RELIABILITY_THRESHOLDS = {
  high_confidence_min: 8.5,
  use_caution_min: 6.5,
} as const;

export const HEARTBEAT_STALE_MS = 120_000;
export const SCAN_STALE_MS = 10 * 60_000;
