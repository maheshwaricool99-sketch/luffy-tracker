import type { MarketId, PriceFreshness } from "@/lib/market-data/shared/types";
import { SCANNER_MIN_USABLE_COVERAGE_PCT } from "@/lib/market-data/core/constants";
import type { MarketScannerSnapshot, ScannerDataState, SkipReason, WarmupPhase } from "./types";

const coverageStore = new Map<MarketId, MarketScannerSnapshot>();

function baseSnapshot(market: MarketId): MarketScannerSnapshot {
  return {
    market,
    coveragePct: 0,
    usableCoveragePct: 0,
    coreCoveragePct: 0,
    priorityCoveragePct: 0,
    extendedCoveragePct: 0,
    warmupPhase: "phase_1_core",
    providerStatus: "healthy",
    providerBackoffActive: false,
    providerCooldownUntil: null,
    providerAvailability: "up",
    liveCount: 0,
    delayedCount: 0,
    cachedCount: 0,
    restoredCount: 0,
    staleCount: 0,
    unavailableCount: 0,
    skippedCount: 0,
    skipReasons: {},
    totalSymbols: 0,
    totalSymbolsAttempted: 0,
    totalSymbolsRejected: 0,
    scannedSymbols: 0,
    coreTarget: 0,
    priorityTarget: 0,
    extendedTarget: 0,
    lastGoodScanAt: null,
    lastCycleStartedAt: null,
    lastCycleCompletedAt: null,
    lastScanAttemptMs: null,
    lastSuccessfulScanMs: null,
    lastPublishEligibleCycleAt: null,
    lastPublishedSignalMs: null,
    lastPriorityScanAt: null,
    lastFullScanAt: null,
    lastSnapshotAt: null,
    snapshotRestored: false,
    degradedMode: false,
    degradedReasons: [],
    scanDurationMs: 0,
    lastScanTime: 0,
    cacheReliancePct: 0,
    warmupCompletePct: 0,
    dataState: "unavailable",
    freshness: "UNAVAILABLE",
  };
}

function clampPct(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function aggregateDataState(snapshot: MarketScannerSnapshot): ScannerDataState {
  if (snapshot.restoredCount > 0 && snapshot.scannedSymbols === 0) return "restored_snapshot";
  if (snapshot.liveCount > 0) return "live";
  if (snapshot.delayedCount > 0) return "delayed";
  if (snapshot.cachedCount > 0) return "cached";
  if (snapshot.staleCount > 0) return "stale";
  return "unavailable";
}

function aggregateFreshness(snapshot: MarketScannerSnapshot): PriceFreshness | "UNAVAILABLE" {
  if (snapshot.liveCount > 0) return "GOOD";
  if (snapshot.delayedCount > 0) return "OK";
  if (snapshot.cachedCount > 0) return "STALE";
  if (snapshot.staleCount > 0) return "REJECT";
  return "UNAVAILABLE";
}

export function startCoverage(args: {
  market: MarketId;
  totalSymbols: number;
  phase: WarmupPhase;
  coreTarget: number;
  priorityTarget: number;
  extendedTarget: number;
  snapshotRestored: boolean;
  degradedReasons: string[];
}) {
  const current = coverageStore.get(args.market) ?? baseSnapshot(args.market);
  const now = Date.now();
  coverageStore.set(args.market, {
    ...current,
    totalSymbols: args.totalSymbols,
    warmupPhase: args.phase,
    coreTarget: args.coreTarget,
    priorityTarget: args.priorityTarget,
    extendedTarget: args.extendedTarget,
    scannedSymbols: 0,
    skippedCount: 0,
    liveCount: 0,
    delayedCount: 0,
    cachedCount: 0,
    restoredCount: args.snapshotRestored ? current.restoredCount : 0,
    staleCount: 0,
    unavailableCount: 0,
    skipReasons: {},
    coveragePct: 0,
    usableCoveragePct: 0,
    coreCoveragePct: 0,
    priorityCoveragePct: 0,
    extendedCoveragePct: 0,
    scanDurationMs: 0,
    lastScanTime: now,
    lastCycleStartedAt: now,
    lastCycleCompletedAt: null,
    lastScanAttemptMs: now,
    degradedReasons: args.degradedReasons,
    degradedMode: args.degradedReasons.length > 0,
    snapshotRestored: args.snapshotRestored,
    warmupCompletePct: 0,
    cacheReliancePct: 0,
    dataState: current.dataState,
    freshness: current.freshness,
  });
}

export function markScanned(
  market: MarketId,
  tier: "core" | "priority" | "extended",
  state: ScannerDataState,
) {
  const current = coverageStore.get(market);
  if (!current) return;
  current.scannedSymbols += 1;
  if (state === "live") current.liveCount += 1;
  else if (state === "delayed") current.delayedCount += 1;
  else if (state === "cached") current.cachedCount += 1;
  else if (state === "restored_snapshot") current.restoredCount += 1;
  else if (state === "stale") current.staleCount += 1;
  else current.unavailableCount += 1;

  const processed = current.scannedSymbols + current.skippedCount;
  current.coveragePct = current.totalSymbols === 0 ? 100 : clampPct((processed / current.totalSymbols) * 100);

  const completedCore = Math.min(current.scannedSymbols, current.coreTarget);
  const completedPriority = Math.min(Math.max(0, current.scannedSymbols - completedCore), current.priorityTarget);
  const completedExtended = Math.min(Math.max(0, current.scannedSymbols - completedCore - completedPriority), current.extendedTarget);

  if (tier === "core") {
    current.coreCoveragePct = current.coreTarget === 0 ? 100 : clampPct((completedCore / current.coreTarget) * 100);
  }
  if (tier === "priority" || current.priorityTarget > 0) {
    current.priorityCoveragePct = current.priorityTarget === 0 ? 100 : clampPct((completedPriority / current.priorityTarget) * 100);
  }
  if (tier === "extended" || current.extendedTarget > 0) {
    current.extendedCoveragePct = current.extendedTarget === 0 ? 100 : clampPct((completedExtended / current.extendedTarget) * 100);
  }
  current.warmupCompletePct = clampPct(
    ((current.coreCoveragePct * 0.35) + (current.priorityCoveragePct * 0.4) + (current.extendedCoveragePct * 0.25)),
  );
  current.cacheReliancePct = current.scannedSymbols === 0 ? 0 : clampPct(((current.cachedCount + current.restoredCount) / current.scannedSymbols) * 100);
  current.dataState = aggregateDataState(current);
  current.freshness = aggregateFreshness(current);
}

export function markSkipped(market: MarketId, reason: SkipReason) {
  const current = coverageStore.get(market);
  if (!current) return;
  current.skippedCount += 1;
  current.totalSymbolsRejected += 1;
  current.skipReasons[reason] = (current.skipReasons[reason] ?? 0) + 1;
  const processed = current.scannedSymbols + current.skippedCount;
  current.coveragePct = current.totalSymbols === 0 ? 100 : clampPct((processed / current.totalSymbols) * 100);
}

export function finishCoverage(
  market: MarketId,
  args: {
    startedAt: number;
    providerStatus: MarketScannerSnapshot["providerStatus"];
    providerBackoffActive: boolean;
    providerCooldownUntil: number | null;
    providerAvailability: MarketScannerSnapshot["providerAvailability"];
    degradedReasons: string[];
    snapshotRestored: boolean;
  },
) {
  const current = coverageStore.get(market);
  if (!current) return;
  const now = Date.now();
  current.scanDurationMs = now - args.startedAt;
  current.lastScanTime = now;
  current.lastCycleCompletedAt = now;
  current.totalSymbolsAttempted = current.scannedSymbols + current.skippedCount;
  current.providerStatus = args.providerStatus;
  current.providerBackoffActive = args.providerBackoffActive;
  current.providerCooldownUntil = args.providerCooldownUntil;
  current.providerAvailability = args.providerAvailability;
  current.snapshotRestored = args.snapshotRestored;
  current.lastSnapshotAt = args.snapshotRestored ? current.lastSnapshotAt ?? now : current.lastSnapshotAt;
  current.degradedReasons = [...new Set(args.degradedReasons)];
  current.usableCoveragePct = current.totalSymbols === 0
    ? 100
    : clampPct((((current.liveCount + current.delayedCount) / current.totalSymbols) * 100));
  const providerDegraded = current.providerStatus === "degraded" || current.providerStatus === "backoff" || current.providerAvailability === "down";
  current.degradedMode =
    current.scannedSymbols === 0 ||
    current.usableCoveragePct < SCANNER_MIN_USABLE_COVERAGE_PCT ||
    current.providerBackoffActive ||
    providerDegraded;
  current.dataState = aggregateDataState(current);
  current.freshness = aggregateFreshness(current);

  if (current.scannedSymbols > 0) {
    current.lastSuccessfulScanMs = now;
  }
  if (current.scannedSymbols > 0 && current.usableCoveragePct >= SCANNER_MIN_USABLE_COVERAGE_PCT && !current.providerBackoffActive && current.providerAvailability !== "down") {
    current.lastGoodScanAt = now;
  }
  if (current.scannedSymbols > 0 && current.usableCoveragePct >= SCANNER_MIN_USABLE_COVERAGE_PCT && current.providerStatus === "healthy") {
    current.lastPublishEligibleCycleAt = now;
  }
  if (current.priorityCoveragePct >= 100) {
    current.lastPriorityScanAt = now;
  }
  if (current.extendedCoveragePct >= 100) {
    current.lastFullScanAt = now;
  }
}

export function recordPublishedSignal(market: MarketId) {
  const current = coverageStore.get(market);
  if (!current) return;
  current.lastPublishedSignalMs = Date.now();
}

export function setRestoredCoverage(markets: MarketScannerSnapshot[]) {
  coverageStore.clear();
  for (const entry of markets) {
    coverageStore.set(entry.market, { ...entry, snapshotRestored: true, restoredCount: Math.max(entry.restoredCount, entry.scannedSymbols) });
  }
}

export function getCoverageSnapshots() {
  return [...coverageStore.values()];
}

export function resetCoverageSnapshotsForTests() {
  coverageStore.clear();
}
