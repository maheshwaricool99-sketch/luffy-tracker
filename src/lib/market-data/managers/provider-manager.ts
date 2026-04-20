import { getCacheValue, setCacheValue, dedupeInflight } from "@/lib/market-data/cache/provider-cache";
import { getSnapshotAgeForMarket, getSnapshotRecord, setSnapshot } from "@/lib/market-data/cache/snapshot-cache";
import {
  FORCED_RESET_AFTER_MS,
  LIVE_PRICE_CACHE_TTL_MS,
  PROVIDER_HEALTHY_AGE_MS,
  PROVIDER_PUBLICATION_MAX_AGE_MS,
  PROVIDER_STALE_AFTER_MS,
  SCANNER_RECOVERY_CYCLES_REQUIRED,
  SNAPSHOT_SAFE_DISPLAY_TTL_MS,
  SNAPSHOT_PRICE_CACHE_TTL_MS,
} from "@/lib/market-data/core/constants";
import { canUseForDisplay, canUseForSignals } from "@/lib/market-data/core/freshness";
import { computeMarketHealthScore } from "@/lib/market-data/core/health-score";
import type { HealthLabel, ProviderHealthState, ScanMode } from "@/lib/market-data/core/enums";
import type {
  MarketDataPoint,
  MarketProvider,
  MarketRuntimeStatus,
  ProviderRuntimeState,
  RecoveryStatus,
  ScannerRuntimeStatus,
} from "@/lib/market-data/core/types";
import { computeScannerFreshnessState, evaluatePublicationGate } from "@/lib/market-data/core/runtime-health";
import { ageMs } from "@/lib/market-data/core/time";
import { appendAudit } from "@/lib/market-data/telemetry/audit-log";
import { emitMarketEvent } from "@/lib/market-data/telemetry/event-bus";
import { incrementMetric, setMetric } from "@/lib/market-data/telemetry/metrics";
import { markProviderFailure, markProviderSuccess } from "./provider-state-machine";
import { alphaVantageProvider } from "../providers/us/alphavantage.provider";
import { finnhubProvider } from "../providers/us/finnhub.provider";
import { yahooUsProvider } from "../providers/us/yahoo.provider";
import { binanceRestProvider } from "../providers/crypto/binance-rest.provider";
import { binanceWsProvider } from "../providers/crypto/binance-ws.provider";
import { bybitProvider } from "../providers/crypto/bybit.provider";
import { coinbaseProvider } from "../providers/crypto/coinbase.provider";
import { coinGeckoProvider } from "../providers/crypto/coingecko.provider";
import { krakenProvider } from "../providers/crypto/kraken.provider";
import { okxProvider } from "../providers/crypto/okx.provider";
import { indiaFallbackProvider } from "../providers/india/india-fallback.provider";
import { nseProvider } from "../providers/india/nse.provider";
import { yahooIndiaProvider } from "../providers/india/yahoo-india.provider";
import type { MarketId } from "../shared/types";

type ManagerState = {
  market: MarketId;
  activeProviderId: string | null;
  providers: ProviderRuntimeState[];
  lastLiveSuccessMs: number | null;
  lastProviderSuccessMs: number | null;
  lastProviderFailureMs: number | null;
  lastResetAtMs: number | null;
  lastProviderSwitchAtMs: number | null;
  lastScanAttemptMs: number | null;
  lastCycleStartedMs: number | null;
  lastCycleCompletedMs: number | null;
  lastSuccessfulScanMs: number | null;
  lastPublishEligibleCycleMs: number | null;
  lastPublishedSignalMs: number | null;
  scannerCoveragePct: number;
  usableCoveragePct: number;
  scanMode: ScanMode;
  symbolsAttempted: number;
  symbolsScanned: number;
  symbolsSkipped: number;
  skipReasons: Record<string, number>;
  recoveryActive: boolean;
  recoveryAttempt: number;
  recoveryHealthyCycles: number;
  blockerReason: string | null;
};

const managers = globalThis.__marketProviderManagers ?? new Map<MarketId, ProviderManager>();

declare global {
  var __marketProviderManagers: Map<MarketId, ProviderManager> | undefined;
}

if (!globalThis.__marketProviderManagers) globalThis.__marketProviderManagers = managers;

const PROVIDERS: Record<MarketId, MarketProvider[]> = {
  crypto: [binanceWsProvider, binanceRestProvider, bybitProvider, okxProvider, coinbaseProvider, krakenProvider, coinGeckoProvider].sort((a, b) => a.priority - b.priority),
  us: [yahooUsProvider, alphaVantageProvider, finnhubProvider].sort((a, b) => a.priority - b.priority),
  india: [nseProvider, yahooIndiaProvider, indiaFallbackProvider].sort((a, b) => a.priority - b.priority),
};

function initialState(market: MarketId): ManagerState {
  return {
    market,
    activeProviderId: PROVIDERS[market][0]?.id ?? null,
    providers: PROVIDERS[market].map((provider) => ({
      providerId: provider.id,
      market,
      priority: provider.priority,
      state: provider.id.includes("fallback") ? "fallback" : "recovering",
      connected: false,
      consecutiveFailures: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      nextRetryAtMs: null,
      lastConnectAtMs: null,
      lastDisconnectAtMs: null,
      lastMessageAtMs: null,
      lastHeartbeatAtMs: null,
      lastHealthyAtMs: null,
      lastSuccessAtMs: null,
      lastFailureAtMs: null,
      staleAfterMs: PROVIDER_STALE_AFTER_MS,
      freshnessAgeMs: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      degradedReasonCode: null,
      degradedReasonMessage: null,
      recoverySource: null,
      recoveryAttempts: 0,
    })),
    lastLiveSuccessMs: null,
    lastProviderSuccessMs: null,
    lastProviderFailureMs: null,
    lastResetAtMs: null,
    lastProviderSwitchAtMs: null,
    lastScanAttemptMs: null,
    lastCycleStartedMs: null,
    lastCycleCompletedMs: null,
    lastSuccessfulScanMs: null,
    lastPublishEligibleCycleMs: null,
    lastPublishedSignalMs: null,
    scannerCoveragePct: 0,
    usableCoveragePct: 0,
    scanMode: "full",
    symbolsAttempted: 0,
    symbolsScanned: 0,
    symbolsSkipped: 0,
    skipReasons: {},
    recoveryActive: false,
    recoveryAttempt: 0,
    recoveryHealthyCycles: 0,
    blockerReason: null,
  };
}

export class ProviderManager {
  private state: ManagerState;

  constructor(public readonly market: MarketId) {
    this.state = initialState(market);
  }

  private get chain() {
    return PROVIDERS[this.market];
  }

  private getRuntime(providerId: string) {
    const runtime = this.state.providers.find((item) => item.providerId === providerId);
    if (!runtime) throw new Error(`Unknown provider ${providerId}`);
    return runtime;
  }

  private setRuntime(next: ProviderRuntimeState) {
    this.state.providers = this.state.providers.map((item) => item.providerId === next.providerId ? next : item);
  }

  private activeProvider() {
    return this.chain.find((provider) => provider.id === this.state.activeProviderId) ?? this.chain[0];
  }

  private rotateProvider(reasonCode: string) {
    const currentIndex = Math.max(0, this.chain.findIndex((provider) => provider.id === this.activeProvider().id));
    const nextProvider = this.chain[(currentIndex + 1) % this.chain.length];
    if (nextProvider.id !== this.state.activeProviderId) {
      appendAudit("PROVIDER_SWITCH", { market: this.market, from: this.state.activeProviderId, to: nextProvider.id, reasonCode });
      emitMarketEvent("PROVIDER_SWITCH", { market: this.market, from: this.state.activeProviderId, to: nextProvider.id, reasonCode });
      incrementMetric(`provider_switch_count:${this.market}`);
      this.state.activeProviderId = nextProvider.id;
      this.state.lastProviderSwitchAtMs = Date.now();
      this.state.recoveryActive = true;
      this.state.recoveryAttempt += 1;
    }
  }

  async hardResetActiveProvider(reasonCode: string) {
    const provider = this.activeProvider();
    const runtime = this.getRuntime(provider.id);
    appendAudit("PROVIDER_RESET", { market: this.market, providerId: provider.id, reasonCode });
    this.state.lastResetAtMs = Date.now();
    this.state.recoveryActive = true;
    this.state.recoveryAttempt += 1;
    this.setRuntime({
      ...runtime,
      connected: false,
      state: "recovering",
      lastDisconnectAtMs: Date.now(),
      degradedReasonCode: reasonCode,
      degradedReasonMessage: "Provider reset triggered by recovery controller",
    });
    await provider.disconnect?.().catch(() => undefined);
    await provider.reset?.().catch(() => undefined);
    await provider.connect?.().catch(() => undefined);
    this.setRuntime({
      ...this.getRuntime(provider.id),
      connected: true,
      lastConnectAtMs: Date.now(),
      recoverySource: provider.id.includes("ws") ? "ws" : "rest",
    });
  }

  async ensureHealthy() {
    const provider = this.activeProvider();
    const runtime = this.getRuntime(provider.id);
    const liveAge = ageMs(this.state.lastProviderSuccessMs);
    if (liveAge !== null && liveAge > FORCED_RESET_AFTER_MS) {
      await this.hardResetActiveProvider("PROVIDER_TIMEOUT");
      const health = await provider.healthCheck();
      if (!health.ok) {
        this.rotateProvider(health.errorCode ?? "RECOVERY_ATTEMPT_FAILED");
      } else {
        const next = { ...runtime, state: "recovering" as const, recoveryAttempts: runtime.recoveryAttempts + 1 };
        this.setRuntime(next);
      }
    }
  }

  private updateScanModeFromState() {
    const snapshotAge = getSnapshotAgeForMarket(this.market);
    const providerState = this.getStatusLabelState();
    const canFallbackDisplay = snapshotAge !== null && canUseForDisplay(snapshotAge);
    this.state.scanMode =
      providerState === "failed" && !canFallbackDisplay ? "halted" :
      providerState === "fallback" || providerState === "backoff" || providerState === "degraded" ? "reduced" :
      "full";
  }

  private getStatusLabelState(): ProviderHealthState {
    const provider = this.activeProvider();
    const runtime = this.getRuntime(provider.id);
    const freshnessAgeMs = ageMs(runtime.lastMessageAtMs);
    if (runtime.state === "backoff" || runtime.state === "failed" || runtime.state === "fallback") {
      return runtime.state;
    }
    if (freshnessAgeMs === null) return runtime.state;
    if (freshnessAgeMs > PROVIDER_STALE_AFTER_MS) return "degraded";
    if (freshnessAgeMs > PROVIDER_HEALTHY_AGE_MS) return "degraded";
    return runtime.state;
  }

  private async tryProvider(provider: MarketProvider, symbols: string[]): Promise<MarketDataPoint[] | null> {
    const runtime = this.getRuntime(provider.id);
    if (runtime.nextRetryAtMs && runtime.nextRetryAtMs > Date.now() && runtime.state === "backoff") {
      appendAudit("BACKOFF_ENTER", {
        market: this.market,
        providerId: provider.id,
        nextRetryAtMs: runtime.nextRetryAtMs,
      });
      return null;
    }

    const result = await provider.fetchPrices(symbols);
    if (result.ok && result.data && result.data.length > 0) {
      const freshestTimestampMs = Math.max(...result.data.map((item) => item.timestampMs));
      const freshestAgeMs = Math.max(0, Date.now() - freshestTimestampMs);
      const recoveredState: ProviderHealthState = freshestAgeMs <= PROVIDER_HEALTHY_AGE_MS ? "live" : "degraded";
      const degradedReasonCode =
        freshestAgeMs > PROVIDER_PUBLICATION_MAX_AGE_MS ? "WS_STREAM_SILENT" :
        freshestAgeMs > PROVIDER_HEALTHY_AGE_MS ? "WS_HEARTBEAT_STALE" :
        "PROVIDER_HEALTHY";
      const degradedReasonMessage =
        degradedReasonCode === "PROVIDER_HEALTHY" ? "Fresh market data flowing" :
        degradedReasonCode === "WS_HEARTBEAT_STALE" ? "Provider connected but market data is older than healthy threshold" :
        "Provider returned stale market data beyond publication threshold";
      const recoverySource: ProviderRuntimeState["recoverySource"] =
        provider.id.includes("ws") ? "ws" :
        provider.id.includes("rest") ? "rest" :
        "failover";
      const next: ProviderRuntimeState = {
        ...markProviderSuccess(runtime),
        connected: true,
        state: recoveredState,
        lastConnectAtMs: runtime.connected ? runtime.lastConnectAtMs : Date.now(),
        lastMessageAtMs: freshestTimestampMs,
        lastHeartbeatAtMs: result.fetchedAtMs,
        lastHealthyAtMs: freshestAgeMs <= PROVIDER_HEALTHY_AGE_MS ? result.fetchedAtMs : runtime.lastHealthyAtMs,
        freshnessAgeMs: freshestAgeMs,
        degradedReasonCode: degradedReasonCode === "PROVIDER_HEALTHY" ? null : degradedReasonCode,
        degradedReasonMessage: degradedReasonCode === "PROVIDER_HEALTHY" ? null : degradedReasonMessage,
        recoverySource,
      };
      this.setRuntime(next);
      this.state.activeProviderId = provider.id;
      this.state.lastProviderSuccessMs = freshestTimestampMs;
      this.state.lastLiveSuccessMs = !result.isFallback && freshestAgeMs <= PROVIDER_HEALTHY_AGE_MS
        ? freshestTimestampMs
        : this.state.lastLiveSuccessMs;
      this.state.blockerReason =
        freshestAgeMs > PROVIDER_PUBLICATION_MAX_AGE_MS ? "Live provider returned stale market data" : null;
      if (freshestAgeMs <= PROVIDER_HEALTHY_AGE_MS) {
        this.state.recoveryHealthyCycles += 1;
      } else {
        this.state.recoveryHealthyCycles = 0;
      }
      if (this.state.recoveryHealthyCycles >= SCANNER_RECOVERY_CYCLES_REQUIRED) {
        this.state.recoveryActive = false;
      }
      for (const item of result.data) {
        setSnapshot({
          market: this.market,
          symbol: item.symbol,
          price: item.price,
          sourceProvider: provider.id,
          capturedAtMs: item.timestampMs,
          ageMs: Date.now() - item.timestampMs,
          symbolCoverage: symbols.length,
          confidenceDowngradeFactor: result.isFallback ? 0.7 : 1,
        });
        setCacheValue(`price:${this.market}:${item.symbol}`, item, result.isFallback ? SNAPSHOT_PRICE_CACHE_TTL_MS : LIVE_PRICE_CACHE_TTL_MS);
      }
      appendAudit("BACKOFF_EXIT", { market: this.market, providerId: provider.id, state: next.state, reasonCode: degradedReasonCode, freshnessAgeMs: freshestAgeMs });
      if (next.state === "degraded") {
        emitMarketEvent("provider.heartbeat.stale", {
          market: this.market,
          providerId: provider.id,
          state: next.state,
          reasonCode: degradedReasonCode,
          reasonMessage: degradedReasonMessage,
          freshnessAgeMs: freshestAgeMs,
          staleAfterMs: PROVIDER_STALE_AFTER_MS,
        });
      } else {
        emitMarketEvent("provider.recovered", {
          market: this.market,
          providerId: provider.id,
          state: next.state,
          reasonCode: "PROVIDER_RECOVERED",
          reasonMessage: "Fresh market data flow restored",
          freshnessAgeMs: freshestAgeMs,
        });
      }
      setMetric(`provider_failure_count:${this.market}:${provider.id}`, next.totalFailures);
      return result.data;
    }

    const failed: ProviderRuntimeState = {
      ...markProviderFailure(runtime, result.errorCode ?? "PROVIDER_UNAVAILABLE", result.errorMessage ?? "provider fetch failed"),
      connected: false,
      lastDisconnectAtMs: Date.now(),
      lastHeartbeatAtMs: Date.now(),
      freshnessAgeMs: ageMs(runtime.lastMessageAtMs),
      degradedReasonCode: result.errorCode ?? "PROVIDER_UNAVAILABLE",
      degradedReasonMessage: result.errorMessage ?? "provider fetch failed",
      recoverySource: provider.id.includes("ws") ? "ws" : provider.id.includes("rest") ? "rest" : "failover",
    };
    this.setRuntime(failed);
    this.state.lastProviderFailureMs = Date.now();
    this.state.recoveryHealthyCycles = 0;
    appendAudit("PROVIDER_FAIL", {
      market: this.market,
      providerId: provider.id,
      attemptCount: failed.consecutiveFailures,
      reasonCode: result.errorCode,
      reasonMessage: result.errorMessage,
      oldState: runtime.state,
      newState: failed.state,
    });
    incrementMetric(`provider_failure_count:${this.market}:${provider.id}`);
    if (failed.consecutiveFailures >= 5) {
      this.rotateProvider(result.errorCode ?? "PROVIDER_UNAVAILABLE");
    }
    return null;
  }

  async fetchPrices(symbols: string[]) {
    await this.ensureHealthy();
    this.updateScanModeFromState();

    const cacheKey = `fetch:${this.market}:${symbols.join(",")}`;
    return dedupeInflight(cacheKey, async () => {
      const cached = symbols
        .map((symbol) => getCacheValue<MarketDataPoint>(`price:${this.market}:${symbol}`))
        .filter((item): item is MarketDataPoint => Boolean(item));
      if (cached.length === symbols.length) return cached;

      const tried = new Set<string>();
      const ordered = [
        this.activeProvider(),
        ...this.chain.filter((provider) => provider.id !== this.activeProvider().id),
      ];

      for (const provider of ordered) {
        if (tried.has(provider.id)) continue;
        tried.add(provider.id);
        const data = await this.tryProvider(provider, symbols);
        if (data && data.length > 0) return data;
      }

      const fallback = symbols
        .map((symbol) => getSnapshotRecord(this.market, symbol))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .filter((item) => canUseForDisplay(item.ageMs))
        .map((item) => ({
          symbol: item.symbol,
          market: this.market,
          price: item.price,
          timestampMs: item.capturedAtMs,
          source: item.sourceProvider,
          isLive: false,
          isFallback: true,
          sourceType: "cached_fallback" as const,
          providerName: item.sourceProvider,
          providerTimestampMs: item.capturedAtMs,
          receivedAtMs: Date.now(),
          latencyMs: 0,
          ageMs: item.ageMs,
          confidenceScore: item.ageMs <= 15_000 ? 0.68 : item.ageMs <= 60_000 ? 0.42 : 0.2,
          degradeReason: item.ageMs <= 60_000 ? "protected_fallback_snapshot" : "snapshot_expired_for_signals",
        }));

      if (fallback.length > 0) {
        appendAudit("SNAPSHOT_ENTER", { market: this.market, snapshotAgeMs: getSnapshotAgeForMarket(this.market) });
        this.state.blockerReason = fallback.some((item) => canUseForSignals(Date.now() - item.timestampMs))
          ? "Live providers unavailable; protected fallback active"
          : "Snapshot expired for signal generation";
        return fallback;
      }

      this.state.blockerReason = "Live feed unavailable; snapshot expired";
      return [];
    });
  }

  recordScanAttempt(totalSymbols: number) {
    const now = Date.now();
    this.state.lastScanAttemptMs = now;
    this.state.lastCycleStartedMs = now;
    this.state.symbolsAttempted = totalSymbols;
  }

  recordScanOutcome(snapshot: {
    scanned: number;
    skipped: number;
    skipReasons: Record<string, number>;
    coveragePct: number;
    usableCoveragePct: number;
    lastCycleCompletedMs: number | null;
    lastSuccessfulScanMs: number | null;
    lastPublishEligibleCycleAt: number | null;
  }) {
    this.state.symbolsScanned = snapshot.scanned;
    this.state.symbolsSkipped = snapshot.skipped;
    this.state.skipReasons = snapshot.skipReasons;
    this.state.scannerCoveragePct = snapshot.coveragePct;
    this.state.usableCoveragePct = snapshot.usableCoveragePct;
    this.state.lastCycleCompletedMs = snapshot.lastCycleCompletedMs;
    if (snapshot.lastSuccessfulScanMs) this.state.lastSuccessfulScanMs = snapshot.lastSuccessfulScanMs;
    if (snapshot.lastPublishEligibleCycleAt) this.state.lastPublishEligibleCycleMs = snapshot.lastPublishEligibleCycleAt;
    this.updateScanModeFromState();
  }

  recordPublishedSignal() {
    this.state.lastPublishedSignalMs = Date.now();
  }

  getScannerStatus(): ScannerRuntimeStatus {
    const freshnessAgeMs = ageMs(this.state.lastSuccessfulScanMs);
    const freshnessState = computeScannerFreshnessState({
      scanMode: this.state.scanMode,
      lastSuccessfulCycleAgeMs: freshnessAgeMs,
      recoveryActive: this.state.recoveryActive,
      usableCoveragePct: this.state.usableCoveragePct,
      providerState: this.getStatusLabelState(),
    });
    const publication = evaluatePublicationGate({
      providerState: this.getStatusLabelState(),
      dataAgeMs: ageMs(this.state.lastProviderSuccessMs),
      scannerFreshnessState: freshnessState,
      usableCoveragePct: this.state.usableCoveragePct,
      blockerReason: this.state.blockerReason,
      snapshotAgeMs: getSnapshotAgeForMarket(this.market),
      scanMode: this.state.scanMode,
    });
    return {
      market: this.market,
      scanMode: this.state.scanMode,
      totalSymbols: this.state.symbolsAttempted,
      symbolsAttempted: this.state.symbolsAttempted,
      symbolsScanned: this.state.symbolsScanned,
      symbolsSkipped: this.state.symbolsSkipped,
      usableCoveragePct: this.state.usableCoveragePct,
      skipReasons: this.state.skipReasons,
      lastCycleStartedMs: this.state.lastCycleStartedMs,
      lastCycleCompletedMs: this.state.lastCycleCompletedMs,
      lastScanAttemptMs: this.state.lastScanAttemptMs,
      lastSuccessfulScanMs: this.state.lastSuccessfulScanMs,
      lastPublishEligibleCycleMs: this.state.lastPublishEligibleCycleMs,
      lastPublishedSignalMs: this.state.lastPublishedSignalMs,
      freshnessState,
      publishEligible: publication.publicationState === "publishable",
    };
  }

  getStatus(): MarketRuntimeStatus {
    this.updateScanModeFromState();
    const snapshotAgeMs = getSnapshotAgeForMarket(this.market);
    const providerState = this.getStatusLabelState();
    const recoveryLevel =
      this.state.lastProviderSwitchAtMs && Date.now() - this.state.lastProviderSwitchAtMs < 60_000 ? "rotating" :
      this.state.recoveryAttempt >= 3 ? "repeated" :
      this.state.recoveryActive ? "retrying" :
      "none";
    const scannerFreshnessAgeMs = ageMs(this.state.lastSuccessfulScanMs);
    const scannerFreshnessState = computeScannerFreshnessState({
      scanMode: this.state.scanMode,
      lastSuccessfulCycleAgeMs: scannerFreshnessAgeMs,
      recoveryActive: this.state.recoveryActive,
      usableCoveragePct: this.state.usableCoveragePct,
      providerState,
    });
    const publication = evaluatePublicationGate({
      providerState,
      dataAgeMs: ageMs(this.state.lastProviderSuccessMs),
      scannerFreshnessState,
      usableCoveragePct: this.state.usableCoveragePct,
      blockerReason: this.state.blockerReason,
      snapshotAgeMs,
      scanMode: this.state.scanMode,
    });
    const signalsPublishable = publication.publicationState !== "blocked";
    const { score, label } = computeMarketHealthScore({
      providerState,
      dataAgeMs: ageMs(this.state.lastProviderSuccessMs),
      coveragePct: this.state.usableCoveragePct,
      recoveryLevel,
      publishable: signalsPublishable,
    });
    const causes = [
      providerState !== "live" ? `Provider state ${providerState}` : null,
      snapshotAgeMs !== null ? `Snapshot age ${snapshotAgeMs}ms` : null,
      publication.blockingConditions.length > 0 ? `Publication ${publication.publicationState}: ${publication.blockingConditions.join(", ")}` : null,
      this.state.blockerReason,
    ].filter((item): item is string => Boolean(item));

    return {
      market: this.market,
      activeProviderId: this.state.activeProviderId,
      providerState,
      dataAgeMs: ageMs(this.state.lastProviderSuccessMs),
      lastLiveSuccessMs: this.state.lastLiveSuccessMs,
      lastProviderSuccessMs: this.state.lastProviderSuccessMs,
      lastProviderFailureMs: this.state.lastProviderFailureMs,
      signalsPublishable,
      publicationState: publication.publicationState,
      publicationReasonCodes: publication.publicationReasonCodes,
      marketFreshEnough: publication.marketFreshEnough,
      scannerFreshEnough: publication.scannerFreshEnough,
      coverageHealthyEnough: publication.coverageHealthyEnough,
      integrityHealthyEnough: publication.integrityHealthyEnough,
      blockingConditions: publication.blockingConditions,
      snapshotActive: snapshotAgeMs !== null && snapshotAgeMs <= SNAPSHOT_SAFE_DISPLAY_TTL_MS,
      snapshotAgeMs,
      scanMode: this.state.scanMode,
      scannerCoveragePct: this.state.scannerCoveragePct,
      usableCoveragePct: this.state.usableCoveragePct,
      scannerFreshnessAgeMs,
      scannerStatus: this.getScannerStatus(),
      recovery: {
        market: this.market,
        active: this.state.recoveryActive,
        retryAttempt: this.state.recoveryAttempt,
        lastResetAtMs: this.state.lastResetAtMs,
        lastProviderSwitchAtMs: this.state.lastProviderSwitchAtMs,
        snapshotAgeMs,
        estimatedNextAction: this.state.recoveryActive ? "Retry active provider or rotate to next provider" : null,
        blockerReason: this.state.blockerReason,
      } satisfies RecoveryStatus,
      providers: this.state.providers,
      statusScore: score,
      statusLabel: label as HealthLabel,
      causes,
    };
  }
}

export function getProviderManager(market: MarketId) {
  const existing = managers.get(market);
  if (existing) return existing;
  const created = new ProviderManager(market);
  managers.set(market, created);
  return created;
}

export function getAllProviderManagers() {
  return (["crypto", "us", "india"] as const).map((market) => getProviderManager(market));
}

export function resetProviderManagersForTests() {
  managers.clear();
}
