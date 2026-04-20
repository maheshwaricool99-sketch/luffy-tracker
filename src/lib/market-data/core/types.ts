import type { MarketId } from "../shared/types";
import type { HealthLabel, ProviderCapability, ProviderHealthState, ScanMode } from "./enums";
import type { PublicationState, ScannerFreshnessState } from "./runtime-health";

export interface MarketDataPoint {
  symbol: string;
  market?: MarketId;
  price: number;
  timestampMs: number;
  source: string;
  isLive: boolean;
  isFallback: boolean;
  sourceType?: "primary_ws" | "primary_rest" | "secondary_ws" | "secondary_rest" | "cached_fallback";
  providerName?: string;
  providerTimestampMs?: number;
  receivedAtMs?: number;
  latencyMs?: number;
  ageMs?: number;
  confidenceScore?: number;
  degradeReason?: string | null;
}

export interface ProviderFetchResult<T> {
  ok: boolean;
  data?: T;
  errorCode?: string;
  errorMessage?: string;
  provider: string;
  fetchedAtMs: number;
  latencyMs: number;
  isFallback: boolean;
}

export interface MarketProvider {
  id: string;
  market: MarketId;
  priority: number;
  capabilities: ProviderCapability[];
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
  reset?(): Promise<void>;
  healthCheck(): Promise<ProviderFetchResult<{ state: ProviderHealthState }>>;
  fetchPrices(symbols: string[]): Promise<ProviderFetchResult<MarketDataPoint[]>>;
  fetchCandles?(symbol: string, timeframe: string): Promise<ProviderFetchResult<unknown>>;
  fetchStructure?(symbol: string): Promise<ProviderFetchResult<unknown>>;
}

export type SnapshotRecord = {
  market: MarketId;
  symbol: string;
  price: number;
  sourceProvider: string;
  capturedAtMs: number;
  ageMs: number;
  symbolCoverage: number;
  confidenceDowngradeFactor: number;
};

export type ProviderRuntimeState = {
  providerId: string;
  market: MarketId;
  priority: number;
  state: ProviderHealthState;
  connected: boolean;
  consecutiveFailures: number;
  totalFailures: number;
  totalSuccesses: number;
  nextRetryAtMs: number | null;
  lastConnectAtMs: number | null;
  lastDisconnectAtMs: number | null;
  lastMessageAtMs: number | null;
  lastHeartbeatAtMs: number | null;
  lastHealthyAtMs: number | null;
  lastSuccessAtMs: number | null;
  lastFailureAtMs: number | null;
  staleAfterMs: number;
  freshnessAgeMs: number | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  degradedReasonCode: string | null;
  degradedReasonMessage: string | null;
  recoverySource: "ws" | "rest" | "snapshot" | "failover" | null;
  recoveryAttempts: number;
};

export type RecoveryStatus = {
  market: MarketId;
  active: boolean;
  retryAttempt: number;
  lastResetAtMs: number | null;
  lastProviderSwitchAtMs: number | null;
  snapshotAgeMs: number | null;
  estimatedNextAction: string | null;
  blockerReason: string | null;
};

export type ScannerRuntimeStatus = {
  market: MarketId;
  scanMode: ScanMode;
  totalSymbols: number;
  symbolsAttempted: number;
  symbolsScanned: number;
  symbolsSkipped: number;
  usableCoveragePct: number;
  skipReasons: Record<string, number>;
  lastCycleStartedMs: number | null;
  lastCycleCompletedMs: number | null;
  lastScanAttemptMs: number | null;
  lastSuccessfulScanMs: number | null;
  lastPublishEligibleCycleMs: number | null;
  lastPublishedSignalMs: number | null;
  freshnessState: ScannerFreshnessState;
  publishEligible: boolean;
};

export type MarketRuntimeStatus = {
  market: MarketId;
  activeProviderId: string | null;
  providerState: ProviderHealthState;
  dataAgeMs: number | null;
  lastLiveSuccessMs: number | null;
  lastProviderSuccessMs: number | null;
  lastProviderFailureMs: number | null;
  signalsPublishable: boolean;
  publicationState: PublicationState;
  publicationReasonCodes: string[];
  marketFreshEnough: boolean;
  scannerFreshEnough: boolean;
  coverageHealthyEnough: boolean;
  integrityHealthyEnough: boolean;
  blockingConditions: string[];
  snapshotActive: boolean;
  snapshotAgeMs: number | null;
  scanMode: ScanMode;
  scannerCoveragePct: number;
  usableCoveragePct: number;
  scannerFreshnessAgeMs: number | null;
  scannerStatus: ScannerRuntimeStatus;
  recovery: RecoveryStatus;
  providers: ProviderRuntimeState[];
  statusScore: number;
  statusLabel: HealthLabel;
  causes: string[];
};
