import { requestJson } from "@/lib/market-data/shared/http";
import { classifyProviderError } from "../shared/provider-error-classifier";
import { failureResult, pointsFromPrices, successResult } from "../shared/provider-utils";
import type { MarketProvider } from "@/lib/market-data/core/types";

function toCoinbaseProductId(symbol: string) {
  const base = symbol.replace(/USDT$/, "");
  return `${base}-USD`;
}

export const coinbaseProvider: MarketProvider = {
  id: "coinbase-rest",
  market: "crypto",
  priority: 4,
  capabilities: ["batch_price"],
  async healthCheck() {
    const result = await this.fetchPrices(["BTCUSDT"]);
    return result.ok
      ? successResult("coinbase-rest", { state: "live" }, result.latencyMs)
      : failureResult("coinbase-rest", result.errorCode ?? "PROVIDER_UNAVAILABLE", result.errorMessage ?? "health failed", result.latencyMs);
  },
  async fetchPrices(symbols) {
    const started = Date.now();
    try {
      const prices = await Promise.all(symbols.map(async (symbol) => {
        const data = await requestJson<{ price: string }>(
          `https://api.exchange.coinbase.com/products/${toCoinbaseProductId(symbol)}/ticker`,
          { retries: 1, timeoutMs: 4_500 },
        );
        return { symbol, price: Number(data.price), timestampMs: Date.now() };
      }));
      return successResult("coinbase-rest", pointsFromPrices("coinbase-rest", prices, true, false), Date.now() - started, false);
    } catch (error) {
      const classified = classifyProviderError(error);
      return failureResult("coinbase-rest", classified.code, classified.message, Date.now() - started);
    }
  },
};
