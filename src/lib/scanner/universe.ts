import { getMarketUniverse } from "@/lib/market-data/shared/symbols";
import type { MarketId } from "@/lib/market-data/shared/types";
import { rankUniverseSymbols } from "./ranking";
import type { RankedUniverse } from "./types";

const watchlistPriority = new Map<MarketId, string[]>([
  ["crypto", ["BTCUSDT", "ETHUSDT", "SOLUSDT"]],
  ["us", ["SPY", "QQQ", "NVDA"]],
  ["india", ["RELIANCE", "TCS", "HDFCBANK"]],
]);

export async function getRankedUniverse(market: MarketId): Promise<RankedUniverse> {
  const available = await getMarketUniverse(market);
  const ranked = rankUniverseSymbols(market, available);
  return {
    market,
    core: ranked.core,
    priority: ranked.priority,
    extended: ranked.extended,
    watchlistPriority: watchlistPriority.get(market) ?? [],
    manualBoost: ranked.manualBoost,
    excluded: ranked.excluded,
    totalAvailable: available.length,
  };
}
