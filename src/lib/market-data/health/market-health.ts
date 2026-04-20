import { getProviderManager } from "../managers/provider-manager";
import type { MarketId } from "../shared/types";

export function getMarketHealthStatus(market: MarketId) {
  return getProviderManager(market).getStatus();
}
