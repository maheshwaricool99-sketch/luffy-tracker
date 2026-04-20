export type ProviderHealthState =
  | "live"
  | "degraded"
  | "fallback"
  | "backoff"
  | "recovering"
  | "disconnected"
  | "failed";

export type ProviderCapability =
  | "stream_price"
  | "batch_price"
  | "candles"
  | "structure"
  | "volume"
  | "metadata";

export type MarketDataErrorCode =
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_RATE_LIMIT"
  | "PROVIDER_INVALID_RESPONSE"
  | "PROVIDER_AUTH_FAILURE"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_PARTIAL_DATA"
  | "CACHE_MISS"
  | "SNAPSHOT_EXPIRED"
  | "SCANNER_ZERO_COVERAGE"
  | "RECOVERY_ATTEMPT_FAILED";

export type ScanMode = "full" | "reduced" | "halted" | "health_only";
export type HealthLabel = "Operational" | "Degraded" | "Partial Outage" | "Down";
