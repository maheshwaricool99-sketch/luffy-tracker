import type { ScanMode } from "@/lib/market-data/core/enums";
import type { MarketId } from "../shared/types";
import { getProviderManager } from "../managers/provider-manager";

export function getScanMode(market: MarketId): ScanMode {
  return getProviderManager(market).getStatus().scanMode;
}
