import type { MarketId } from "@/lib/market-data/shared/types";
import { getProviderManager } from "@/lib/market-data/managers/provider-manager";
import type { ProviderRuntime } from "./types";

function toLegacyProviderRuntime(market: MarketId): ProviderRuntime {
  const status = getProviderManager(market).getStatus();
  const active = status.providers.find((provider) => provider.providerId === status.activeProviderId) ?? status.providers[0];
  return {
    key: market === "crypto" ? "crypto-feed" : market === "us" ? "us-feed" : "india-feed",
    market,
    label: active?.providerId ?? `${market}-provider`,
    source: status.activeProviderId ?? "none",
    status:
      status.providerState === "live" ? "healthy" :
      status.providerState === "failed" ? "unavailable" :
      status.providerState === "backoff" ? "backoff" :
      "degraded",
    availability: status.providerState === "failed" ? "down" : status.providerState === "live" ? "up" : "partial",
    successRate: active ? Math.round((active.totalSuccesses / Math.max(1, active.totalSuccesses + active.totalFailures)) * 1000) / 10 : 0,
    successCount: active?.totalSuccesses ?? 0,
    failureCount: active?.totalFailures ?? 0,
    consecutiveFailures: active?.consecutiveFailures ?? 0,
    backoffActive: status.providerState === "backoff",
    cooldownUntil: active?.nextRetryAtMs ?? null,
    cacheTtlMs: market === "crypto" ? 10_000 : 30_000,
    staleAcceptableTtlMs: 60_000,
    hardExpiredTtlMs: 120_000,
    timeoutMs: 6_000,
    retryLimit: 1,
    failureThreshold: 5,
    degradedTrigger: "managed by provider-manager",
    requestBudgetPerCycle: status.scanMode === "full" ? 72 : status.scanMode === "reduced" ? 18 : 4,
    warmupBudget: status.scanMode === "full" ? 18 : 8,
    retryBudget: 3,
    maxInFlight: status.scanMode === "full" ? 4 : 2,
    batchSize: 12,
    activeRequests: 0,
    lastSuccessAt: status.lastProviderSuccessMs,
    lastFailureAt: status.lastProviderFailureMs,
    lastError: active?.lastErrorMessage ?? status.recovery.blockerReason,
  };
}

export function getProviderKeyForMarket(market: MarketId) {
  return market === "crypto" ? "crypto-feed" : market === "us" ? "us-feed" : "india-feed";
}

export function getProviderRuntime(market: MarketId): ProviderRuntime {
  return toLegacyProviderRuntime(market);
}

export function recordProviderRequestStart(market: MarketId) {
  void market;
}
export function recordProviderRequestEnd(market: MarketId) {
  void market;
}

export function recordProviderSuccess(market: MarketId) {
  getProviderManager(market).ensureHealthy().catch(() => undefined);
}

export function recordProviderFailure(market: MarketId, reason: string) {
  void reason;
  getProviderManager(market).ensureHealthy().catch(() => undefined);
}

export function markProviderUnavailable(market: MarketId, reason: string) {
  void getProviderManager(market).hardResetActiveProvider(reason);
}

export function hydrateProviderRuntime(runtime: ProviderRuntime) {
  void runtime;
}

export function getAllProviderRuntimes() {
  return (["crypto", "us", "india"] as const).map((market) => getProviderRuntime(market));
}
