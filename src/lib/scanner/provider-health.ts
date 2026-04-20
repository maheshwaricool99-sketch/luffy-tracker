import { getAllProviderRuntimes, getProviderRuntime, hydrateProviderRuntime } from "./backoff";
import { getCoverageSnapshots, setRestoredCoverage } from "./coverage";
import { readScannerPersistenceSnapshot } from "./snapshot";
import { SNAPSHOT_SAFE_DISPLAY_TTL_MS } from "@/lib/market-data/core/constants";
import { getProviderManager } from "@/lib/market-data/managers/provider-manager";

let restoreAttempted = false;
let snapshotRestoreActive = false;

export async function restoreScannerStateFromSnapshot() {
  if (restoreAttempted) {
    return {
      restored: snapshotRestoreActive,
      snapshot: await readScannerPersistenceSnapshot(),
    };
  }

  restoreAttempted = true;
  const snapshot = await readScannerPersistenceSnapshot();
  if (!snapshot) return { restored: false, snapshot: null };
  if (Date.now() - snapshot.savedAt > SNAPSHOT_SAFE_DISPLAY_TTL_MS) {
    snapshotRestoreActive = false;
    return { restored: false, snapshot: null };
  }

  setRestoredCoverage(snapshot.scanner.markets);
  for (const provider of snapshot.scanner.providers) {
    hydrateProviderRuntime(provider);
  }
  snapshotRestoreActive = true;
  return { restored: true, snapshot };
}

export function clearSnapshotRestoreFlag() {
  snapshotRestoreActive = false;
}

export function getScannerHealthSnapshot() {
  const markets = getCoverageSnapshots();
  const providers = getAllProviderRuntimes();
  const degraded =
    markets.some((entry) => entry.degradedMode || (entry.usableCoveragePct ?? 0) === 0) ||
    (["crypto", "us", "india"] as const).some((market) => {
      const status = getProviderManager(market).getStatus();
      return status.providerState === "backoff" || status.providerState === "failed" || status.publicationState === "blocked";
    });
  return {
    degraded,
    snapshotRestoreActive,
    providers,
    markets,
  };
}

export function getProviderStateForMarket(market: "crypto" | "us" | "india") {
  return getProviderRuntime(market);
}
