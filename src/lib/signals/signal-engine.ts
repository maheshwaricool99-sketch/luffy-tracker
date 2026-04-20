import { persistProductSignal, toProductSignal } from "@/lib/signals/publishing-rules";
import { getDecisionLog, recordDecision } from "@/lib/audit/decision-log";
import { getIntegrityLog, recordIntegrityIssue } from "@/lib/audit/integrity-log";
import { getModelOutputLog } from "@/lib/audit/model-output-log";
import { getSignalAuditLog } from "@/lib/audit/signal-audit-log";
import { getCandles } from "@/lib/market-data/shared/candle-service";
import { getCatalystRows } from "@/lib/market-data/shared/catalyst-service";
import { getDerivativesMetrics } from "@/lib/market-data/shared/derivatives-service";
import { getHealth, getSnapshot } from "@/lib/market-data/shared/price-service";
import { getPlatformHealthStatus } from "@/lib/market-data/health/platform-health";
import { isWithinTradingHours } from "@/lib/market-data/core/market-hours";
import { getSnapshotRecord } from "@/lib/market-data/cache/snapshot-cache";
import { getStructureMetrics } from "@/lib/market-data/shared/structure-service";
import type { MarketId, PriceSnapshot } from "@/lib/market-data/shared/types";
import { average, clamp } from "@/lib/market-data/shared/utils";
import { getVolumeMetrics } from "@/lib/market-data/shared/volume-service";
import { getWhaleMetrics } from "@/lib/market-data/shared/whale-service";
import { runBreakoutModel } from "@/lib/models/breakout-model";
import { runContinuationModel } from "@/lib/models/continuation-model";
import { runEarlyDetectionFilter } from "@/lib/models/early-detection-filter";
import { runHighConfidenceFilter } from "@/lib/models/high-confidence-filter";
import { normalizeModelOutput } from "@/lib/models/model-normalizer";
import { runReversalModel } from "@/lib/models/reversal-model";
import { getRegimeContext } from "@/lib/regime/regime-engine";
import {
  getProviderRuntime,
  recordProviderFailure,
  recordProviderRequestEnd,
  recordProviderRequestStart,
  recordProviderSuccess,
} from "@/lib/scanner/backoff";
import { getCoverageSnapshots, markScanned, recordPublishedSignal } from "@/lib/scanner/coverage-tracker";
import { prepareMarketScan } from "@/lib/scanner/scanner-orchestrator";
import { getProviderManager } from "@/lib/market-data/managers/provider-manager";
import { getRecoveryController } from "@/lib/market-data/recovery/recovery-controller";
import { clearSnapshotRestoreFlag, getScannerHealthSnapshot, restoreScannerStateFromSnapshot } from "@/lib/scanner/provider-health";
import { writeScannerPersistenceSnapshot } from "@/lib/scanner/snapshot";
import type { ScannerDataState } from "@/lib/scanner/types";
import { runPublishGuard } from "@/lib/validation/publish-guard";
import { canPublishSignal, canRunScanners, readRuntimeFlagsSnapshot, runtimeConfig, RuntimePolicyError } from "@/lib/runtime";
import { reconcileLifecycle } from "./signal-lifecycle";
import { aggregateModelOutputs } from "./signal-aggregator";
import { publishSignal } from "./signal-publisher";
import {
  getActiveSignals,
  getHealthSnapshot,
  getLastEngineRun,
  getPublishedSignals,
  replaceSignals,
  setHealthSnapshot,
  setLastEngineRun,
  updateSignal,
} from "./signal-store";
import type { BlockedSignalReasonCode, HealthSnapshot, ModelOutput, PublishedSignal, SignalFeatureContext, SignalRunResult } from "./signal-types";

const ENGINE_TTL_MS = 90_000;
const MIN_SIGNAL_FLOOR = 3;
let inFlightRun: Promise<SignalRunResult> | null = null;
let restoredTerminalState = false;


async function mapWithLimit<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>) {
  const results = new Array<R>(items.length);
  let index = 0;

  async function runner() {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runner()));
  return results;
}

function computeMomentumScore(candles: Awaited<ReturnType<typeof getCandles>>) {
  const closes = candles.map((item) => item.close);
  if (closes.length < 6) return 50;
  const recent = closes.slice(-6);
  const start = recent[0];
  const end = recent[recent.length - 1];
  const movePct = start > 0 ? ((end - start) / start) * 100 : 0;
  return clamp(0, 100, 50 + movePct * 10);
}

function computeRiskLevels(price: number, lows: number[], highs: number[], direction: "long" | "short") {
  const recentLow = Math.min(...lows.slice(-12));
  const recentHigh = Math.max(...highs.slice(-12));
  if (direction === "long") {
    const stopLoss = Math.min(price * 0.985, recentLow || price * 0.985);
    const takeProfit = price + ((price - stopLoss) * 1.9);
    return { entry: price, stopLoss, takeProfit };
  }
  const stopLoss = Math.max(price * 1.015, recentHigh || price * 1.015);
  const takeProfit = price - ((stopLoss - price) * 1.9);
  return { entry: price, stopLoss, takeProfit };
}

async function buildFeatureContext(symbol: string, market: MarketId): Promise<SignalFeatureContext> {
  const [priceSnapshot, candles, structure, volume, derivatives, whale, catalystRows] = await Promise.all([
    getSnapshot(symbol, market),
    getCandles(symbol, market, 40),
    getStructureMetrics(symbol, market),
    getVolumeMetrics(symbol, market),
    getDerivativesMetrics(symbol, market),
    getWhaleMetrics(symbol, market),
    getCatalystRows(market),
  ]);
  const catalyst = catalystRows.find((row) => row.symbol === symbol)?.catalystScore ?? 0;
  const candleAgeMs = Date.now() - (candles[candles.length - 1]?.ts ?? 0);
  const regime = getRegimeContext(candles, priceSnapshot);
  const momentumScore = computeMomentumScore(candles);
  const directionHint: "long" | "short" = structure.trendShift >= 0 ? "long" : "short";
  const levels = computeRiskLevels(
    priceSnapshot.price,
    candles.map((item) => item.low),
    candles.map((item) => item.high),
    directionHint,
  );
  const risk = Math.abs(levels.entry - levels.stopLoss);
  const reward = Math.abs(levels.takeProfit - levels.entry);
  const expectedR = risk > 0 ? reward / risk : 0;
  return {
    symbol,
    market,
    priceSnapshot,
    candles,
    candleAgeMs,
    structure: {
      score: structure.structureScore,
      compressionPct: structure.compressionPct,
      equalZoneHits: structure.equalZoneHits,
      movePct: structure.movePct,
      trendShift: structure.trendShift,
    },
    momentumScore,
    volume,
    catalystScore: catalyst,
    whaleScore: whale.whaleScore,
    derivativesScore: derivatives.derivativesScore,
    regime,
    expectedR,
    entry: levels.entry,
    stopLoss: levels.stopLoss,
    takeProfit: levels.takeProfit,
    rationaleInputs: [
      `${market}:${symbol}`,
      `structure:${structure.structureScore}`,
      `volume:${volume.anomalyScore}`,
      `momentum:${momentumScore.toFixed(1)}`,
      `catalyst:${catalyst}`,
    ],
    invalidatesOn: [],
  };
}

function classifyDataState(snapshot: PriceSnapshot): ScannerDataState {
  if (snapshot.deliveryState === "cached") return snapshot.ageMs <= 120_000 ? "cached" : "stale";
  if (snapshot.freshness === "GOOD") return "live";
  if (snapshot.freshness === "OK") return "delayed";
  if (snapshot.freshness === "STALE") return "stale";
  return "unavailable";
}

function toBlockedSignalReasonCode(reason: string, context: SignalFeatureContext, coverageComplete: boolean, degraded: boolean): BlockedSignalReasonCode {
  if (reason.includes("stale-fallback") || context.priceSnapshot.deliveryState === "cached") return "BLOCKED_FALLBACK_PRICE_ONLY";
  if (reason.includes("stale-data") || context.priceSnapshot.ageMs > 90_000) return "BLOCKED_PRICE_TOO_OLD";
  if (reason.includes("incomplete-scan") || !coverageComplete) return "BLOCKED_LOW_COVERAGE";
  if (reason.includes("degraded-mode") || degraded) return "BLOCKED_DEGRADED_INPUT";
  if (reason.includes("timestamp-mismatch")) return "BLOCKED_DEGRADED_INPUT";
  if (reason.includes("provider") || reason.includes("backoff")) return "BLOCKED_PROVIDER_UNHEALTHY";
  return "BLOCKED_STALE_SCANNER";
}

function toBlockedSignalReasonText(code: BlockedSignalReasonCode, context: SignalFeatureContext): string {
  switch (code) {
    case "BLOCKED_FALLBACK_PRICE_ONLY":
      return `Fallback-only price path active for ${context.symbol}; publish protection withheld the signal until a healthier provider confirms the move.`;
    case "BLOCKED_PRICE_TOO_OLD":
      return `Input price for ${context.symbol} is older than the safe threshold for trade-quality publication.`;
    case "BLOCKED_LOW_COVERAGE":
      return `Scanner coverage is below the publish threshold, so the setup is withheld instead of being published with weak confirmation.`;
    case "BLOCKED_PROVIDER_UNHEALTHY":
      return `The primary provider is unhealthy or in backoff, so provider-quality confirmation is missing.`;
    case "BLOCKED_DEGRADED_INPUT":
      return `The setup depends on degraded market inputs and was blocked until freshness and provider quality recover.`;
    case "BLOCKED_CROSS_MARKET_CONFIRMATION_MISSING":
      return `Cross-market confirmation is missing for this setup, so publication remains blocked.`;
    case "BLOCKED_STALE_SCANNER":
    default:
      return `Scanner freshness for ${context.market.toUpperCase()} is outside the safe publish window.`;
  }
}

function buildBlockedSignals(health: ReturnType<typeof getScannerHealthSnapshot>) {
  const decisionLog = getDecisionLog().slice(-100);
  const recentBlocked = decisionLog.filter((entry) => entry.stage === "publish-guard").slice(-30);
  return recentBlocked.map((entry, index) => {
    const market = entry.market as MarketId;
    const scanner = health.markets.find((item) => item.market === market);
    const provider = health.providers.find((item) => item.market === market);
    const reason = String(entry.reason ?? "stale-scanner");
    const reasonCode: BlockedSignalReasonCode =
      reason.includes("incomplete-scan") ? "BLOCKED_LOW_COVERAGE" :
      reason.includes("stale-fallback") ? "BLOCKED_FALLBACK_PRICE_ONLY" :
      reason.includes("stale-data") ? "BLOCKED_PRICE_TOO_OLD" :
      reason.includes("degraded") ? "BLOCKED_DEGRADED_INPUT" :
      reason.includes("provider") || reason.includes("backoff") ? "BLOCKED_PROVIDER_UNHEALTHY" :
      "BLOCKED_STALE_SCANNER";
    const scope: "symbol" | "market" =
      reasonCode === "BLOCKED_LOW_COVERAGE" || reasonCode === "BLOCKED_STALE_SCANNER" ? "market" : "symbol";
    return {
      signalId: `blocked-${entry.symbol}-${entry.timestamp}-${index}`,
      symbol: String(entry.symbol),
      market,
      strategy: String(entry.metadata?.strategy ?? "publish-guard"),
      blockedAt: entry.timestamp,
      reasonCode,
      reasonText: String(entry.reason),
      primaryProvider: String(provider?.source ?? provider?.label ?? "unknown"),
      fallbackProvider: scanner && (scanner.cachedCount > 0 || scanner.restoredCount > 0) ? String(provider?.source ?? "cache") : null,
      inputAgeMs: typeof entry.metadata?.priceAgeMs === "number" ? entry.metadata.priceAgeMs : null,
      scannerAgeMs: scanner?.lastSuccessfulScanMs ? Date.now() - scanner.lastSuccessfulScanMs : null,
      affectedDependencies: [
        scanner?.providerStatus ? `provider:${scanner.providerStatus}` : "provider:unknown",
        scanner?.dataState ? `data:${scanner.dataState}` : "data:unknown",
      ],
      canAutoRecover: true,
      nextRetryAt: provider?.cooldownUntil ?? (entry.timestamp + 30_000),
      scope,
      active: Date.now() - entry.timestamp < 15 * 60_000,
    };
  });
}

function zeroModelLatency() {
  return {
    continuation_model: { avgMs: 0, invalidCount: 0, outputCount: 0 },
    breakout_model: { avgMs: 0, invalidCount: 0, outputCount: 0 },
    reversal_model: { avgMs: 0, invalidCount: 0, outputCount: 0 },
    high_confidence_filter: { avgMs: 0, invalidCount: 0, outputCount: 0 },
    early_detection_filter: { avgMs: 0, invalidCount: 0, outputCount: 0 },
  };
}

function buildHealthSnapshot(degradedReasons: string[]): HealthSnapshot {
  const scannerHealth = getScannerHealthSnapshot();
  const runtime = readRuntimeFlagsSnapshot();
  const modelLog = getModelOutputLog();
  const modelLatency = zeroModelLatency();

  for (const entry of modelLog) {
    const bucket = modelLatency[entry.model];
    bucket.outputCount += 1;
    if (!entry.accepted) bucket.invalidCount += 1;
  }

  const validationFailures = getIntegrityLog().reduce<Record<string, number>>((acc, item) => {
    acc[item.issue] = (acc[item.issue] ?? 0) + 1;
    return acc;
  }, {});

  const fallbackUsage = getPublishedSignals().reduce<Record<string, number>>((acc, item) => {
    const key = item.sourceMeta.fallbackSource ?? "primary-only";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const skipReasons = scannerHealth.markets.reduce<HealthSnapshot["skipReasons"]>((acc, market) => {
    for (const [reason, count] of Object.entries(market.skipReasons)) {
      acc[reason as keyof typeof acc] = ((acc[reason as keyof typeof acc] as number | undefined) ?? 0) + count;
    }
    return acc;
  }, {});

  const blockedSignals = buildBlockedSignals(scannerHealth);

  return {
    degraded: degradedReasons.length > 0 || scannerHealth.degraded,
    degradedReasons: [...new Set([...degradedReasons, ...(scannerHealth.degraded ? ["scanner-degraded"] : [])])],
    snapshotRestoreActive: scannerHealth.snapshotRestoreActive,
    engine: {
      status: scannerHealth.snapshotRestoreActive && getLastEngineRun() === 0 ? "restored" : inFlightRun || getLastEngineRun() === 0 ? "warming" : "ready",
      inFlight: Boolean(inFlightRun),
      lastRun: getLastEngineRun(),
      publishedCount: getPublishedSignals().length,
      restoredSignals: getPublishedSignals().filter((item) => item.sourceMeta.restoredFromSnapshot).length,
    },
    sourceHealth: scannerHealth.markets.map((market) => {
      const runtime = getProviderManager(market.market).getStatus();
      return {
        market: market.market,
        open: isWithinTradingHours(market.market),
        freshness: market.freshness,
        lastSyncTs: runtime.lastProviderSuccessMs ?? market.lastSuccessfulScanMs ?? market.lastScanTime,
        fallbackActive: runtime.snapshotActive || market.cachedCount > 0 || market.restoredCount > 0,
        primarySource: runtime.activeProviderId ?? scannerHealth.providers.find((provider) => provider.market === market.market)?.source ?? "unknown",
        dataState: market.dataState,
        providerStatus:
          runtime.providerState === "live" ? "healthy" :
          runtime.providerState === "failed" ? "unavailable" :
          runtime.providerState === "backoff" ? "backoff" :
          "degraded",
        providerBackoffActive: runtime.providerState === "backoff",
        providerCooldownUntil: runtime.providers.find((provider) => provider.providerId === runtime.activeProviderId)?.nextRetryAtMs ?? market.providerCooldownUntil,
        coveragePct: market.coveragePct,
        warmupPhase: market.warmupPhase,
        liveCount: market.liveCount,
        cachedCount: market.cachedCount,
        restoredCount: market.restoredCount,
        staleCount: market.staleCount,
      };
    }),
    scanner: scannerHealth.markets,
    providers: scannerHealth.providers,
    modelLatency,
    validationFailures,
    fallbackUsage,
    skipReasons,
    blockedSignals,
    runtimeFlags: runtime.flags,
    runtimeVersion: runtime.version,
  };
}

async function restoreTerminalStateIfNeeded() {
  if (restoredTerminalState || getLastEngineRun() > 0) return;

  const restored = await restoreScannerStateFromSnapshot();
  if (!restored.snapshot) {
    restoredTerminalState = true;
    return;
  }

  replaceSignals(
    restored.snapshot.publishedSignals.map((signal) => ({
      ...signal,
      sourceMeta: {
        ...signal.sourceMeta,
        dataState: "restored_snapshot",
        restoredFromSnapshot: true,
      },
    })),
  );

  setHealthSnapshot(buildHealthSnapshot(["restored-snapshot-active"]));
  restoredTerminalState = true;
}

async function persistTerminalState() {
  await writeScannerPersistenceSnapshot({
    scanner: getScannerHealthSnapshot(),
    publishedSignals: getPublishedSignals().slice(0, 300),
  });
}

async function scanMarket(market: MarketId, degradedReasons: string[]) {
  const existingCoverage = getCoverageSnapshots().find((entry) => entry.market === market);
  const scan = await prepareMarketScan(market, {
    snapshotRestored: existingCoverage?.snapshotRestored,
    priorityCovered: (existingCoverage?.priorityCoveragePct ?? 0) >= 100,
    fullCovered: (existingCoverage?.extendedCoveragePct ?? 0) >= 100,
  });

  const published: PublishedSignal[] = [];
  const rejected: Array<{ symbol: string; market: MarketId; reason: string }> = [];
  const provider = getProviderRuntime(market);

  await mapWithLimit(scan.symbols, scan.limits.concurrency, async (item) => {
    if (provider.backoffActive && provider.activeRequests >= provider.maxInFlight) {
      scan.skip(new Error("backoff active"));
      rejected.push({ symbol: item.symbol, market, reason: "backoff-active" });
      return null;
    }

    recordProviderRequestStart(market);
    try {
      const context = await buildFeatureContext(item.symbol, market);
      const dataState = classifyDataState(context.priceSnapshot);
      const startedAt = Date.now();
      const models = [
        runContinuationModel(context),
        runBreakoutModel(context),
        runReversalModel(context),
        runHighConfidenceFilter(context),
        runEarlyDetectionFilter(context),
      ]
        .map((output) =>
          normalizeModelOutput({
            ...output,
            meta: {
              sourceModel: output.meta?.sourceModel ?? "continuation_model",
              candleTimeframe: output.meta?.candleTimeframe,
              dataQuality: output.meta?.dataQuality,
              latencyMs: Date.now() - startedAt,
            },
          }),
        )
        .filter((output): output is ModelOutput => Boolean(output));

      const candidate = aggregateModelOutputs(models, context);
      const guard = runPublishGuard(candidate, context, true, degradedReasons.length > 0);
      markScanned(market, item.tier, dataState);
      recordProviderSuccess(market);

      if (!candidate || !guard.ok) {
        const reason = guard.reason ?? "candidate-rejected";
        rejected.push({ symbol: item.symbol, market, reason });
        const reasonCode = toBlockedSignalReasonCode(reason, context, true, degradedReasons.length > 0);
        recordDecision({
          symbol: item.symbol,
          market,
          stage: "publish-guard",
          reason,
          metadata: {
            reasonCode,
            reasonText: toBlockedSignalReasonText(reasonCode, context),
            strategy: "signal-engine",
            priceAgeMs: context.priceSnapshot.ageMs,
            primaryProvider: context.priceSnapshot.providerName ?? context.priceSnapshot.source,
            fallbackProvider: context.priceSnapshot.fallback ?? null,
            dataState: context.priceSnapshot.deliveryState ?? "live",
          },
          timestamp: Date.now(),
        });
        return null;
      }

      try {
        canPublishSignal((await runtimeConfig.getAll()).flags);
      } catch (error) {
        if (error instanceof RuntimePolicyError) {
          rejected.push({ symbol: item.symbol, market, reason: error.code });
          recordDecision({
            symbol: item.symbol,
            market,
            stage: "publish-guard",
            reason: error.code,
            metadata: {
              reasonCode: "BLOCKED_DEGRADED_INPUT",
              reasonText: "Signal publishing is paused by runtime control; candidates are evaluated but withheld from publication.",
              strategy: "signal-engine",
              priceAgeMs: context.priceSnapshot.ageMs,
              primaryProvider: context.priceSnapshot.providerName ?? context.priceSnapshot.source,
              fallbackProvider: context.priceSnapshot.fallback ?? null,
              dataState: context.priceSnapshot.deliveryState ?? "live",
            },
            timestamp: Date.now(),
          });
          return null;
        }
        throw error;
      }

      const signal = publishSignal(candidate, context);
      published.push(signal);
      recordPublishedSignal(market);
      getProviderManager(market).recordPublishedSignal();
      return signal;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "scan-failure";
      recordProviderFailure(market, reason);
      recordIntegrityIssue({ market, symbol: item.symbol, issue: reason, severity: "warn", timestamp: Date.now() });
      scan.skip(error);
      rejected.push({ symbol: item.symbol, market, reason });
      return null;
    } finally {
      recordProviderRequestEnd(market);
    }
  });

  if (provider.backoffActive) degradedReasons.push(`${market}-provider-backoff`);
  scan.finish();

  return {
    published,
    rejected,
  };
}

const RECONCILE_PRICE_MAX_AGE_MS = 120_000; // 2 min — stale snapshots must not trigger TP/SL

function reconcileExistingSignals() {
  const now = Date.now();
  for (const signal of getActiveSignals()) {
    const snap = getSnapshotRecord(signal.market as MarketId, signal.symbol);
    // Only reconcile when we have a recent price. A stale snapshot (e.g. from a
    // cached/restored session) can be seconds to minutes behind, causing false TP/SL.
    if (!snap || now - snap.capturedAtMs > RECONCILE_PRICE_MAX_AGE_MS) continue;
    const reconciled = reconcileLifecycle(signal, snap.price);
    updateSignal(reconciled);
  }
}

async function executeSignalEngineRun(): Promise<SignalRunResult> {
  const runtime = await runtimeConfig.getAll();
  const degradedReasons: string[] = [];
  try {
    canRunScanners(runtime.flags);
  } catch (error) {
    if (error instanceof RuntimePolicyError) {
      degradedReasons.push(runtime.flags.maintenance_mode ? "maintenance-mode-active" : "scanners-paused-by-admin");
      const health = buildHealthSnapshot(degradedReasons);
      setHealthSnapshot(health);
      return {
        published: getPublishedSignals(),
        rejected: [],
        health,
      };
    }
    throw error;
  }
  const marketHealth = await getHealth();
  const platformHealth = getPlatformHealthStatus();
  const platformByMarket = new Map(platformHealth.markets.map((m) => [m.market, m]));
  const marketDegradedReasons = new Map<string, string[]>();
  for (const market of marketHealth.markets) {
    const reasons = [...degradedReasons];
    const platform = platformByMarket.get(market.marketId);
    if (platform && !platform.signalsPublishable) {
      reasons.push(`${market.marketId}-provider-warning`);
      degradedReasons.push(`${market.marketId}-provider-warning`);
    }
    marketDegradedReasons.set(market.marketId, reasons);
  }

  const results = await Promise.all((["crypto", "us", "india"] as const).map((market) => scanMarket(market, marketDegradedReasons.get(market) ?? degradedReasons)));
  reconcileExistingSignals();
  clearSnapshotRestoreFlag();
  const health = buildHealthSnapshot(degradedReasons);
  setHealthSnapshot(health);
  setLastEngineRun(Date.now());
  await persistTerminalState();

  // Flush in-memory signals to SQLite so the /api/signals route always serves fresh data.
  const allSignals = getPublishedSignals();
  for (const signal of allSignals) {
    const product = toProductSignal(signal);
    if (product) {
      try { persistProductSignal(product); } catch { /* non-fatal */ }
    }
  }

  return {
    published: allSignals,
    rejected: results.flatMap((item) => item.rejected),
    health,
  };
}

async function executeUntilUseful(force = false) {
  const firstRun = await executeSignalEngineRun();
  const needsCatchup =
    firstRun.published.length < MIN_SIGNAL_FLOOR &&
    firstRun.health.providers.every((provider) => !provider.backoffActive && provider.status !== "unavailable") &&
    firstRun.health.scanner.some((market) => market.priorityCoveragePct < 100 || market.extendedCoveragePct < 35);

  if (!force && !needsCatchup) return firstRun;

  if (needsCatchup) {
    return executeSignalEngineRun();
  }

  return firstRun;
}

export async function runSignalEngine(force = false): Promise<SignalRunResult> {
  getRecoveryController();
  await restoreTerminalStateIfNeeded();
  const lastRun = getLastEngineRun();
  const coldStart = lastRun === 0;
  const cached: SignalRunResult = {
    published: getPublishedSignals(),
    rejected: [],
    health: getHealthSnapshot() ?? buildHealthSnapshot(lastRun > 0 ? [] : ["engine-cold-start"]),
  };

  if (!force && !coldStart && (lastRun > 0 && Date.now() - lastRun < ENGINE_TTL_MS)) {
    return cached;
  }

  if (!inFlightRun) {
    inFlightRun = executeUntilUseful(force).finally(() => {
      inFlightRun = null;
    });
  }

  // Never block HTTP requests on a background scan — return whatever is cached
  // immediately. On cold start with no data, return empty so the page loads fast.
  if (!force) return cached;
  return inFlightRun;
}

export async function getDashboardSnapshot() {
  const run = await runSignalEngine();
  const signals = run.published.slice(0, 12);
  const byClass = run.published.reduce<Record<string, number>>((acc, item) => {
    acc[item.class] = (acc[item.class] ?? 0) + 1;
    return acc;
  }, {});
  return {
    signals,
    health: run.health,
    summary: {
      totalSignals: run.published.length,
      elite: byClass.elite ?? 0,
      strong: byClass.strong ?? 0,
      watchlist: byClass.watchlist ?? 0,
      avgConfidence: Math.round(average(run.published.map((item) => item.confidence))),
    },
  };
}

export async function getSignalsSnapshot(market?: MarketId) {
  await runSignalEngine();
  return getPublishedSignals(market);
}

export async function getSignalDetail(id: string) {
  await runSignalEngine();
  return getPublishedSignals().find((item) => item.id === id) ?? null;
}

export async function getPerformanceSnapshot() {
  await runSignalEngine();
  const signals = getPublishedSignals();
  const closed = signals.filter((item) => item.lifecycleState.startsWith("closed_"));
  const wins = closed.filter((item) => item.lifecycleState === "closed_tp").length;
  const losses = closed.filter((item) => item.lifecycleState === "closed_sl").length;
  const avgR = average(
    closed.map((item) =>
      item.lifecycleState === "closed_tp" ? item.expectedR : item.lifecycleState === "closed_sl" ? -1 : 0,
    ),
  );
  const confidenceBuckets = [
    { label: "90+", min: 90, max: 100 },
    { label: "80-89", min: 80, max: 89 },
    { label: "70-79", min: 70, max: 79 },
    { label: "<70", min: 0, max: 69 },
  ].map((bucket) => ({
    bucket: bucket.label,
    count: signals.filter((item) => item.confidence >= bucket.min && item.confidence <= bucket.max).length,
  }));

  return {
    totalSignals: signals.length,
    closedSignals: closed.length,
    winRate: closed.length > 0 ? Number(((wins / closed.length) * 100).toFixed(2)) : 0,
    averageR: Number(avgR.toFixed(2)),
    expectancy: closed.length > 0 ? Number((((wins / closed.length) * avgR) - ((losses / closed.length) * 1)).toFixed(2)) : 0,
    byMarket: ["crypto", "us", "india"].map((market) => ({
      market,
      count: signals.filter((item) => item.market === market).length,
    })),
    byClass: ["elite", "strong", "watchlist"].map((signalClass) => ({
      class: signalClass,
      count: signals.filter((item) => item.class === signalClass).length,
    })),
    confidenceBuckets,
    last50: signals.slice(0, 50).map((item) => ({
      id: item.id,
      symbol: item.symbol,
      market: item.market,
      class: item.class,
      outcome: item.lifecycleState,
      expectedR: item.expectedR,
      confidence: item.confidence,
      timestamp: item.timestamp,
      sourceState: item.sourceMeta.dataState,
    })),
  };
}

export async function getHealthTerminalSnapshot() {
  const run = await runSignalEngine();
  return {
    ...run.health,
    engine: {
      ...run.health.engine,
      status: run.health.snapshotRestoreActive && run.health.engine.lastRun === 0 ? "restored" : run.health.engine.status,
      inFlight: Boolean(inFlightRun),
      publishedCount: getPublishedSignals().length,
      restoredSignals: getPublishedSignals().filter((item) => item.sourceMeta.restoredFromSnapshot).length,
    },
  };
}

export async function getAlertsSnapshot() {
  await runSignalEngine();
  return getActiveSignals().slice(0, 25).map((item) => ({
    id: item.id,
    symbol: item.symbol,
    market: item.market,
    class: item.class,
    confidence: item.confidence,
    lifecycleState: item.lifecycleState,
    timestamp: item.timestamp,
    sourceState: item.sourceMeta.dataState,
  }));
}

export async function getWatchlistsSnapshot() {
  await runSignalEngine();
  const grouped = ["crypto", "us", "india"].map((market) => ({
    market,
    items: getPublishedSignals(market as MarketId).slice(0, 12).map((item) => ({
      symbol: item.symbol,
      direction: item.direction,
      confidence: item.confidence,
      class: item.class,
      sourceState: item.sourceMeta.dataState,
      freshness: item.dataQuality,
    })),
  }));
  return grouped;
}

export async function getSettingsSnapshot() {
  return {
    tiers: {
      analyst: { delaySeconds: 900, detailLevel: "summary", historyLimit: 20 },
      professional: { delaySeconds: 0, detailLevel: "full", historyLimit: 500 },
    },
    filters: {
      markets: ["crypto", "us", "india"],
      classes: ["elite", "strong", "watchlist"],
      freshness: ["live", "delayed", "cached", "restored_snapshot", "stale"],
    },
  };
}

// Pre-warm at module load so the first HTTP request finds cached data, not a cold scan.
// Then run every 5 minutes to keep SQLite fresh regardless of traffic.
if (typeof process !== "undefined" && process.env.NEXT_RUNTIME !== "edge") {
  setTimeout(() => { runSignalEngine().catch(() => {}); }, 200);
  setInterval(() => { runSignalEngine(true).catch(() => {}); }, 5 * 60 * 1000);
}

export async function getAdminSnapshot() {
  await runSignalEngine();
  return {
    models: getModelOutputLog(),
    scanner: getScannerHealthSnapshot(),
    integrity: getIntegrityLog(),
    replay: {
      decisions: getDecisionLog(),
      audit: getSignalAuditLog(),
    },
  };
}
