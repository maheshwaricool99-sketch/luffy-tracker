import type { MarketId } from "@/lib/market-data/shared/types";
import { getRankedUniverse } from "./universe";

export async function getEligibleSymbols(market: MarketId) {
  const universe = await getRankedUniverse(market);
  return [...universe.core, ...universe.priority, ...universe.extended].map((symbol) => ({ symbol }));
}
