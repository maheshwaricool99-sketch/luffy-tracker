import type { MarketId, PriceFreshness } from "@/lib/market-data/shared/types";
import type { PublishedSignal } from "@/lib/signals/signal-types";

export type ScannerDataState =
  | "live"
  | "delayed"
  | "cached"
  | "restored_snapshot"
  | "stale"
  | "unavailable";

export type SkipReason =
  | "rate_limited"
  | "upstream_timeout"
  | "upstream_unavailable"
  | "parsing_failure"
  | "invalid_response"
  | "no_fresh_candles"
  | "stale_volume"
  | "unsupported_instrument"
  | "temporarily_deprioritized"
  | "backoff_active"
  | "max_attempt_threshold";

export type WarmupPhase =
  | "phase_1_core"
  | "phase_2_priority"
  | "phase_3_extended"
  | "phase_4_full";

export type ScannerProviderKey = "crypto-feed" | "us-feed" | "india-feed";

export type ProviderPolicy = {
  key: ScannerProviderKey;
  market: MarketId;
  label: string;
  source: string;
  timeoutMs: number;
  retryLimit: number;
  failureThreshold: number;
  cooldownMs: number;
  cacheTtlMs: number;
  staleAcceptableTtlMs: number;
  hardExpiredTtlMs: number;
  degradedTrigger: string;
  maxInFlight: number;
  batchSize: number;
  requestBudgetPerCycle: number;
  warmupBudget: number;
  retryBudget: number;
};

export type ProviderRuntime = {
  key: ScannerProviderKey;
  market: MarketId;
  label: string;
  source: string;
  status: "healthy" | "degraded" | "backoff" | "unavailable";
  availability: "up" | "partial" | "down";
  successRate: number;
  successCount: number;
  failureCount: number;
  consecutiveFailures: number;
  backoffActive: boolean;
  cooldownUntil: number | null;
  cacheTtlMs: number;
  staleAcceptableTtlMs: number;
  hardExpiredTtlMs: number;
  timeoutMs: number;
  retryLimit: number;
  failureThreshold: number;
  degradedTrigger: string;
  requestBudgetPerCycle: number;
  warmupBudget: number;
  retryBudget: number;
  maxInFlight: number;
  batchSize: number;
  activeRequests: number;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  lastError: string | null;
};

export type RankedUniverse = {
  market: MarketId;
  core: string[];
  priority: string[];
  extended: string[];
  watchlistPriority: string[];
  manualBoost: string[];
  excluded: string[];
  totalAvailable: number;
};

export type MarketScanPlan = {
  market: MarketId;
  providerKey: ScannerProviderKey;
  phase: WarmupPhase;
  symbols: Array<{ symbol: string; tier: "core" | "priority" | "extended" }>;
  universe: RankedUniverse;
  limits: {
    maxRequests: number;
    concurrency: number;
    batchSize: number;
    retryBudget: number;
    warmupBudget: number;
  };
  snapshotRestored: boolean;
  degradedReasons: string[];
};

export type MarketScannerSnapshot = {
  market: MarketId;
  scanMode?: "full" | "reduced" | "halted" | "health_only";
  coveragePct: number;
  usableCoveragePct: number;
  coreCoveragePct: number;
  priorityCoveragePct: number;
  extendedCoveragePct: number;
  warmupPhase: WarmupPhase;
  providerStatus: ProviderRuntime["status"];
  providerBackoffActive: boolean;
  providerCooldownUntil: number | null;
  providerAvailability: ProviderRuntime["availability"];
  liveCount: number;
  delayedCount: number;
  cachedCount: number;
  restoredCount: number;
  staleCount: number;
  unavailableCount: number;
  skippedCount: number;
  skipReasons: Partial<Record<SkipReason, number>>;
  totalSymbols: number;
  totalSymbolsAttempted: number;
  totalSymbolsRejected: number;
  scannedSymbols: number;
  coreTarget: number;
  priorityTarget: number;
  extendedTarget: number;
  lastGoodScanAt: number | null;
  lastCycleStartedAt: number | null;
  lastCycleCompletedAt: number | null;
  lastScanAttemptMs?: number | null;
  lastSuccessfulScanMs?: number | null;
  lastPublishEligibleCycleAt?: number | null;
  lastPublishedSignalMs?: number | null;
  lastPriorityScanAt: number | null;
  lastFullScanAt: number | null;
  lastSnapshotAt: number | null;
  snapshotRestored: boolean;
  degradedMode: boolean;
  degradedReasons: string[];
  scanDurationMs: number;
  lastScanTime: number;
  cacheReliancePct: number;
  warmupCompletePct: number;
  dataState: ScannerDataState;
  freshness: PriceFreshness | "UNAVAILABLE";
};

export type ScannerHealthSnapshot = {
  degraded: boolean;
  snapshotRestoreActive: boolean;
  providers: ProviderRuntime[];
  markets: MarketScannerSnapshot[];
};

export type ScannerPersistenceSnapshot = {
  schemaVersion: number;
  savedAt: number;
  scanner: ScannerHealthSnapshot;
  publishedSignals: PublishedSignal[];
};
