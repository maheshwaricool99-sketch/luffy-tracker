import type { MarketId } from "@/lib/market-data/shared/types";
import { getProviderManager } from "@/lib/market-data/managers/provider-manager";
import { buildScannerPlan } from "@/lib/market-data/scanner/scanner-coordinator";
import { getRankedUniverse } from "./universe";
import type { MarketScanPlan, WarmupPhase } from "./types";

const phaseProgress = new Map<MarketId, WarmupPhase>();

function nextPhase(current?: WarmupPhase, hasPriorityCoverage = false, hasFullCoverage = false): WarmupPhase {
  if (!current) return "phase_2_priority";
  if (current === "phase_1_core" && hasPriorityCoverage) return "phase_2_priority";
  if (current === "phase_2_priority" && hasPriorityCoverage) return "phase_3_extended";
  if (current === "phase_3_extended" && hasFullCoverage) return "phase_4_full";
  return current;
}

export async function buildMarketScanPlan(
  market: MarketId,
  options?: { snapshotRestored?: boolean; priorityCovered?: boolean; fullCovered?: boolean },
): Promise<MarketScanPlan> {
  const universe = await getRankedUniverse(market);
  const provider = getProviderManager(market).getStatus();
  const scannerPlan = await buildScannerPlan(market);
  const phase = nextPhase(phaseProgress.get(market), options?.priorityCovered, options?.fullCovered);
  phaseProgress.set(market, phase);

  const core = universe.core.map((symbol) => ({ symbol, tier: "core" as const }));
  const priority = [...universe.watchlistPriority, ...universe.priority]
    .filter((symbol, index, array) => array.indexOf(symbol) === index && !universe.core.includes(symbol))
    .map((symbol) => ({ symbol, tier: "priority" as const }));
  const extended = universe.extended.map((symbol) => ({ symbol, tier: "extended" as const }));

  const requestBudget = scannerPlan.scanMode === "full" ? 72 : scannerPlan.scanMode === "reduced" ? 18 : 4;
  const warmupBudget = scannerPlan.scanMode === "full" ? 18 : 8;
  const concurrency = scannerPlan.scanMode === "full" ? 4 : 2;
  const cap = scannerPlan.scanMode === "full" ? requestBudget : Math.max(6, Math.floor(requestBudget * 0.75));
  const priorityCap = Math.min(cap, Math.max(warmupBudget * 3, 36));
  const extendedCap = Math.min(cap, Math.max(warmupBudget * 4, 56));
  const phaseSelected =
    phase === "phase_1_core" ? core.slice(0, warmupBudget) :
    phase === "phase_2_priority" ? [...core, ...priority].slice(0, priorityCap) :
    phase === "phase_3_extended" ? [...core, ...priority, ...extended.slice(0, Math.max(32, extendedCap - core.length - priority.length))].slice(0, extendedCap) :
    [...core, ...priority, ...extended].slice(0, cap);
  const selectedSymbols = scannerPlan.scanMode === "full"
    ? phaseSelected
    : phaseSelected.filter((item) => scannerPlan.symbols.includes(item.symbol));

  const degradedReasons: string[] = [];
  if (provider.providerState === "backoff") degradedReasons.push("provider-backoff-active");
  if (provider.scanMode !== "full") degradedReasons.push(`scan-mode-${provider.scanMode}`);
  if (options?.snapshotRestored) degradedReasons.push("restored-snapshot-active");
  if (scannerPlan.scanMode === "halted") degradedReasons.push("all-providers-failed-or-snapshot-expired");

  return {
    market,
    providerKey: market === "crypto" ? "crypto-feed" : market === "us" ? "us-feed" : "india-feed",
    phase,
    symbols: selectedSymbols,
    universe,
    limits: {
      maxRequests: cap,
      concurrency,
      batchSize: 12,
      retryBudget: 3,
      warmupBudget,
    },
    snapshotRestored: Boolean(options?.snapshotRestored),
    degradedReasons,
  };
}
