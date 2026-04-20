import type { MarketId } from "../shared/types";
import { getProviderManager } from "../managers/provider-manager";
import { getScannerUniverse } from "./scanner-universe";

export async function buildScannerPlan(market: MarketId) {
  const manager = getProviderManager(market);
  const status = manager.getStatus();
  const universe = await getScannerUniverse(market);
  const selected =
    status.scanMode === "halted" ? [] :
    status.scanMode === "reduced" || status.scanMode === "health_only"
      ? universe.priority
      : [...new Set([...universe.ranked.core, ...universe.ranked.priority, ...universe.ranked.extended])];
  return {
    scanMode: status.scanMode,
    symbols: selected,
    degraded: status.scanMode !== "full",
  };
}
