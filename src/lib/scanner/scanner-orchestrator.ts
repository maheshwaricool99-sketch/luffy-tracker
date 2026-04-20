import type { MarketId } from "@/lib/market-data/shared/types";
import { finishCoverage, getCoverageSnapshots, markSkipped, startCoverage } from "./coverage";
import { buildMarketScanPlan } from "./scheduler";
import { getProviderRuntime } from "./backoff";
import { getProviderManager } from "@/lib/market-data/managers/provider-manager";
import { classifySkipReason } from "./diagnostics";

export async function prepareMarketScan(
  market: MarketId,
  options?: { snapshotRestored?: boolean; priorityCovered?: boolean; fullCovered?: boolean },
) {
  const plan = await buildMarketScanPlan(market, options);
  const startedAt = Date.now();
  const provider = getProviderRuntime(market);
  getProviderManager(market).recordScanAttempt(plan.symbols.length);
  startCoverage({
    market,
    totalSymbols: plan.symbols.length,
    phase: plan.phase,
    coreTarget: plan.symbols.filter((item) => item.tier === "core").length,
    priorityTarget: plan.symbols.filter((item) => item.tier === "priority").length,
    extendedTarget: plan.symbols.filter((item) => item.tier === "extended").length,
    snapshotRestored: plan.snapshotRestored,
    degradedReasons: plan.degradedReasons,
  });

  return {
    market,
    startedAt,
    phase: plan.phase,
    limits: plan.limits,
    universe: plan.universe,
    provider,
    symbols: plan.symbols,
    snapshotRestored: plan.snapshotRestored,
    degradedReasons: [...plan.degradedReasons],
    skip(reason: unknown) {
      markSkipped(market, classifySkipReason(reason));
    },
    finish(additionalReasons: string[] = []) {
      const runtime = getProviderRuntime(market);
      finishCoverage(market, {
        startedAt,
        providerStatus: runtime.status,
        providerBackoffActive: runtime.backoffActive,
        providerCooldownUntil: runtime.cooldownUntil,
        providerAvailability: runtime.availability,
        degradedReasons: [...plan.degradedReasons, ...additionalReasons],
        snapshotRestored: plan.snapshotRestored,
      });
      const snapshot = getCoverageSnapshots().find((entry) => entry.market === market);
      const manager = getProviderManager(market);
      manager.recordScanOutcome({
        scanned: snapshot?.scannedSymbols ?? 0,
        skipped: snapshot?.skippedCount ?? 0,
        skipReasons: Object.fromEntries(Object.entries(snapshot?.skipReasons ?? {}).map(([key, value]) => [key, value ?? 0])),
        coveragePct: snapshot?.coveragePct ?? 0,
        usableCoveragePct: snapshot?.usableCoveragePct ?? 0,
        lastCycleCompletedMs: snapshot?.lastCycleCompletedAt ?? null,
        lastSuccessfulScanMs: snapshot?.lastSuccessfulScanMs ?? null,
        lastPublishEligibleCycleAt: snapshot?.lastPublishEligibleCycleAt ?? null,
      });
    },
  };
}
