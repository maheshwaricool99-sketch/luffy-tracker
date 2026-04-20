import { BACKOFF_BASE_DELAY_MS, BACKOFF_MAX_DELAY_MS, HARD_FAILURE_THRESHOLD, SOFT_FAILURE_THRESHOLD } from "@/lib/market-data/core/constants";
import type { ProviderRuntimeState } from "@/lib/market-data/core/types";
import type { ProviderHealthState } from "@/lib/market-data/core/enums";

export function nextBackoffDelayMs(attemptCount: number) {
  return Math.min(BACKOFF_BASE_DELAY_MS * (2 ** Math.max(0, attemptCount - 1)), BACKOFF_MAX_DELAY_MS);
}

export function markProviderSuccess(runtime: ProviderRuntimeState) {
  return {
    ...runtime,
    state: "live" as const,
    consecutiveFailures: 0,
    totalSuccesses: runtime.totalSuccesses + 1,
    nextRetryAtMs: null,
    lastSuccessAtMs: Date.now(),
    lastErrorCode: null,
    lastErrorMessage: null,
  };
}

export function markProviderFailure(runtime: ProviderRuntimeState, errorCode: string, errorMessage: string) {
  const consecutiveFailures = runtime.consecutiveFailures + 1;
  const totalFailures = runtime.totalFailures + 1;
  const nextRetryAtMs = Date.now() + nextBackoffDelayMs(consecutiveFailures);
  const state: ProviderHealthState =
    consecutiveFailures >= HARD_FAILURE_THRESHOLD ? "backoff" :
    consecutiveFailures >= SOFT_FAILURE_THRESHOLD ? "degraded" :
    "degraded";
  return {
    ...runtime,
    state,
    consecutiveFailures,
    totalFailures,
    nextRetryAtMs,
    lastFailureAtMs: Date.now(),
    lastErrorCode: errorCode,
    lastErrorMessage: errorMessage,
  };
}
