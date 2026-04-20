import { getSnapshotRecord } from "@/lib/market-data/cache/snapshot-cache";
import { failureResult, successResult } from "../shared/provider-utils";
import type { MarketProvider } from "@/lib/market-data/core/types";

export const indiaFallbackProvider: MarketProvider = {
  id: "india-fallback",
  market: "india",
  priority: 3,
  capabilities: ["batch_price"],
  async healthCheck() {
    return successResult("india-fallback", { state: "fallback" }, 0, true);
  },
  async fetchPrices(symbols) {
    const rows = symbols
      .map((symbol) => getSnapshotRecord("india", symbol))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .map((row) => ({
        symbol: row.symbol,
        price: row.price,
        timestampMs: row.capturedAtMs,
        source: row.sourceProvider,
        isLive: false,
        isFallback: true,
      }));
    if (rows.length === 0) return failureResult("india-fallback", "CACHE_MISS", "No India fallback snapshot available", 0, true);
    return successResult("india-fallback", rows, 0, true);
  },
};
