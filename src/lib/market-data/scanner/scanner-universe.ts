import { getRankedUniverse } from "@/lib/scanner/universe";
import type { MarketId } from "../shared/types";
import { getPriorityUniverse } from "./degraded-scan-policy";

export async function getScannerUniverse(market: MarketId) {
  const ranked = await getRankedUniverse(market);
  return {
    ranked,
    priority: [...new Set([...getPriorityUniverse(market), ...ranked.watchlistPriority, ...ranked.core, ...ranked.priority])],
  };
}
