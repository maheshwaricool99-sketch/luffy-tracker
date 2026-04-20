import { requestJson } from "@/lib/market-data/shared/http";
import { classifyProviderError } from "../shared/provider-error-classifier";
import { failureResult, pointsFromPrices, successResult } from "../shared/provider-utils";
import type { MarketProvider } from "@/lib/market-data/core/types";

export const bybitProvider: MarketProvider = {
  id: "bybit-rest",
  market: "crypto",
  priority: 3,
  capabilities: ["batch_price"],
  async healthCheck() {
    const result = await this.fetchPrices(["BTCUSDT"]);
    return result.ok ? successResult("bybit-rest", { state: "live" }, result.latencyMs) : failureResult("bybit-rest", result.errorCode ?? "PROVIDER_UNAVAILABLE", result.errorMessage ?? "health failed", result.latencyMs);
  },
  async fetchPrices(symbols) {
    const started = Date.now();
    try {
      const prices = await Promise.all(symbols.map(async (symbol) => {
        const data = await requestJson<{ result?: { list?: Array<{ lastPrice: string; time: number }> } }>(
          `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`,
          { retries: 1, timeoutMs: 4_500 },
        );
        const row = data.result?.list?.[0];
        if (!row?.lastPrice) throw new Error("partial bybit data");
        return { symbol, price: Number(row.lastPrice), timestampMs: Number(row.time ?? Date.now()) };
      }));
      return successResult("bybit-rest", pointsFromPrices("bybit-rest", prices, true, false), Date.now() - started, false);
    } catch (error) {
      const classified = classifyProviderError(error);
      return failureResult("bybit-rest", classified.code, classified.message, Date.now() - started);
    }
  },
};
