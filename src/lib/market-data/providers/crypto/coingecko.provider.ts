import { requestJson } from "@/lib/market-data/shared/http";
import { classifyProviderError } from "../shared/provider-error-classifier";
import { failureResult, successResult } from "../shared/provider-utils";
import type { MarketDataPoint, MarketProvider } from "@/lib/market-data/core/types";

export const coinGeckoProvider: MarketProvider = {
  id: "coingecko-rest",
  market: "crypto",
  priority: 6,
  capabilities: ["batch_price", "metadata"],
  async healthCheck() {
    const result = await this.fetchPrices(["BTCUSDT"]);
    return result.ok
      ? successResult("coingecko-rest", { state: "fallback" }, result.latencyMs, true)
      : failureResult("coingecko-rest", result.errorCode ?? "PROVIDER_UNAVAILABLE", result.errorMessage ?? "health failed", result.latencyMs, true);
  },
  async fetchPrices(symbols) {
    const started = Date.now();
    try {
      const rows = await Promise.all(symbols.map(async (symbol) => {
        const base = symbol.replace(/USDT$/, "").toLowerCase();
        const data = await requestJson<Array<{ current_price: number; last_updated?: string }>>(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&symbols=${base}`,
          { retries: 1, timeoutMs: 4_500 },
        );
        const row = data[0];
        const timestampMs = row?.last_updated ? Date.parse(row.last_updated) : Date.now();
        return {
          symbol,
          price: Number(row?.current_price ?? 0),
          timestampMs,
        };
      }));
      const points: MarketDataPoint[] = rows.map((item) => ({
        symbol: item.symbol,
        market: "crypto",
        price: item.price,
        timestampMs: item.timestampMs,
        source: "coingecko-rest",
        isLive: false,
        isFallback: true,
        sourceType: "secondary_rest",
        providerName: "coingecko-rest",
        providerTimestampMs: item.timestampMs,
        receivedAtMs: Date.now(),
        latencyMs: Date.now() - started,
        ageMs: Math.max(0, Date.now() - item.timestampMs),
        confidenceScore: 0.52,
        degradeReason: "broad_reference_feed",
      }));
      return successResult("coingecko-rest", points, Date.now() - started, true);
    } catch (error) {
      const classified = classifyProviderError(error);
      return failureResult("coingecko-rest", classified.code, classified.message, Date.now() - started, true);
    }
  },
};
