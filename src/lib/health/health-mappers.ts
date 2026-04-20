import type { ScannerDataState, SkipReason, WarmupPhase } from "@/lib/scanner/types";
import type { MarketStatus, ScannerMode, ProviderHealthStatus } from "./health-types";

export const SKIP_REASON_LABELS: Record<SkipReason, string> = {
  rate_limited: "Rate Limited",
  upstream_timeout: "Upstream Timeout",
  upstream_unavailable: "Provider Unavailable",
  parsing_failure: "Parsing Error",
  invalid_response: "Invalid Response",
  no_fresh_candles: "No Fresh Candles",
  stale_volume: "Stale Volume",
  unsupported_instrument: "Unsupported Symbol",
  temporarily_deprioritized: "Low Priority",
  backoff_active: "Provider Backoff",
  max_attempt_threshold: "Max Retries",
};

export const REASON_CODE_COPY: Record<string, { title: string; description: string }> = {
  RISK_EXPOSURE_CAP: {
    title: "Portfolio Risk Cap Reached",
    description: "New entries are paused because portfolio exposure is already at the configured risk limit.",
  },
  DUPLICATE_SYMBOL: {
    title: "Duplicate Exposure Blocked",
    description: "A similar symbol or side is already active, so duplicate risk is prevented.",
  },
  EXECUTION_FAILED_NO_LIVE_PRICE: {
    title: "Live Price Confirmation Missing",
    description: "A candidate existed, but execution validation could not confirm a reliable live price.",
  },
  WAITING_FOR_VALID_REPLACEMENTS: {
    title: "Waiting for Higher-Quality Replacements",
    description: "Replacement logic is active, but no new setups currently meet the required confidence threshold.",
  },
  MACRO_FILTER_BLOCKING: {
    title: "Macro Filter Active",
    description: "Current macro conditions are suppressing weak signals. Only high-confidence setups will pass.",
  },
  SCANNER_WARMUP: {
    title: "Scanner Warm-Up in Progress",
    description: "Coverage is still building. Signal quality improves as more symbols are verified.",
  },
  SIGNAL_ENGINE_WARMING: {
    title: "Signal Engine Initializing",
    description: "The signal engine is starting up and building its first stable scan snapshot.",
  },
  NO_VALID_SETUPS: {
    title: "No High-Confidence Setups Found",
    description: "The scanner ran successfully, but no symbols met the required quality thresholds this cycle.",
  },
};

export function mapDataStateToMarketStatus(
  dataState: ScannerDataState,
  snapshotRestored: boolean,
  coveragePct: number,
  providerStatus: "healthy" | "degraded" | "backoff" | "unavailable",
): MarketStatus {
  if (dataState === "unavailable") return "blocked";
  if (snapshotRestored || dataState === "restored_snapshot") return "snapshot";
  if (dataState === "stale" || coveragePct < 30) return "degraded";
  if (dataState === "cached" || providerStatus === "backoff" || providerStatus === "degraded") return "snapshot";
  if (dataState === "delayed" || providerStatus !== "healthy") return "degraded";
  return "live";
}

export function mapWarmupPhaseToScannerMode(
  warmupPhase: WarmupPhase,
  degraded: boolean,
  providerBackoffActive: boolean,
  coveragePct: number,
): ScannerMode {
  if (coveragePct === 0) return "blocked";
  if (degraded) return "degraded";
  if (providerBackoffActive) return "backoff";
  if (warmupPhase === "phase_1_core" || warmupPhase === "phase_2_priority") return "warmup";
  return "steady";
}

export function mapProviderStatus(
  status: "healthy" | "degraded" | "backoff" | "unavailable",
  backoffActive: boolean,
  fallbackActive: boolean,
): ProviderHealthStatus {
  if (status === "healthy" && !fallbackActive) return "healthy";
  if (fallbackActive) return "fallback";
  if (backoffActive || status === "backoff") return "rate_limited";
  if (status === "degraded") return "delayed";
  if (status === "unavailable") return "down";
  return "active";
}

export function marketStatusLabel(status: MarketStatus): string {
  switch (status) {
    case "live": return "Live";
    case "snapshot": return "Snapshot";
    case "degraded": return "Degraded";
    case "blocked": return "Blocked";
  }
}

export function marketStatusWhatItMeans(status: MarketStatus): string {
  switch (status) {
    case "live":
      return "Live market data is healthy. Signal timing and price context are reliable.";
    case "snapshot":
      return "Structure and trend analysis remain valid, but entries may reflect slight timing lag until live data resumes.";
    case "degraded":
      return "Market monitoring is partially impaired. Coverage or freshness is reduced — new signals should be treated with caution.";
    case "blocked":
      return "New signals from this market are paused until usable data returns.";
  }
}

export function freshnessAgeToState(ageMs: number | null): "live" | "delayed" | "stale" {
  if (ageMs === null) return "stale";
  if (ageMs < 30_000) return "live";
  if (ageMs < 120_000) return "delayed";
  return "stale";
}

export function scannerModeLabel(mode: ScannerMode): string {
  switch (mode) {
    case "warmup": return "Warm-Up";
    case "steady": return "Steady State";
    case "backoff": return "Provider Backoff";
    case "degraded": return "Degraded";
    case "blocked": return "Blocked";
  }
}

export function warmupPhaseLabel(phase: WarmupPhase): string {
  switch (phase) {
    case "phase_1_core": return "Phase 1 — Core symbols";
    case "phase_2_priority": return "Phase 2 — Priority symbols";
    case "phase_3_extended": return "Phase 3 — Extended universe";
    case "phase_4_full": return "Phase 4 — Full scan";
  }
}
