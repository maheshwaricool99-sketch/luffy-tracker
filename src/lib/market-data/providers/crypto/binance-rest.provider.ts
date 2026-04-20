import { requestJson } from "@/lib/market-data/shared/http";
import { classifyProviderError } from "../shared/provider-error-classifier";
import { failureResult, pointsFromPrices, successResult } from "../shared/provider-utils";
import type { MarketProvider } from "@/lib/market-data/core/types";

export const binanceRestProvider: MarketProvider = {
  id: "binance-rest",
  market: "crypto",
  priority: 2,
  capabilities: ["batch_price"],
  async healthCheck() {
    const result = await this.fetchPrices(["BTCUSDT"]);
    return result.ok ? successResult("binance-rest", { state: "live" }, result.latencyMs) : failureResult("binance-rest", result.errorCode ?? "PROVIDER_UNAVAILABLE", result.errorMessage ?? "health failed", result.latencyMs);
  },
  async fetchPrices(symbols) {
    const started = Date.now();
    try {
      const prices = await Promise.all(symbols.map(async (symbol) => {
        const data = await requestJson<{ bidPrice: string; askPrice: string; time?: number }>(
          `https://fapi.binance.com/fapi/v1/ticker/bookTicker?symbol=${symbol}`,
          { retries: 1, timeoutMs: 4_000 },
        );
        const ts = Number(data.time ?? Date.now());
        return { symbol, price: (Number(data.bidPrice) + Number(data.askPrice)) / 2, timestampMs: ts };
      }));
      return successResult("binance-rest", pointsFromPrices("binance-rest", prices, true, false), Date.now() - started, false);
    } catch (error) {
      const classified = classifyProviderError(error);
      return failureResult("binance-rest", classified.code, classified.message, Date.now() - started);
    }
  },
};
