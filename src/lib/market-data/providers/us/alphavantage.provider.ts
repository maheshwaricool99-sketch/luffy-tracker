import { requestJson } from "@/lib/market-data/shared/http";
import { classifyProviderError } from "../shared/provider-error-classifier";
import { failureResult, pointsFromPrices, successResult } from "../shared/provider-utils";
import type { MarketProvider } from "@/lib/market-data/core/types";

const apiKey = process.env.ALPHAVANTAGE_API_KEY;

export const alphaVantageProvider: MarketProvider = {
  id: "alphavantage",
  market: "us",
  priority: 2,
  capabilities: ["batch_price"],
  async healthCheck() {
    if (!apiKey) return failureResult("alphavantage", "PROVIDER_AUTH_FAILURE", "ALPHAVANTAGE_API_KEY missing", 0);
    const result = await this.fetchPrices(["SPY"]);
    return result.ok ? successResult("alphavantage", { state: "live" }, result.latencyMs) : failureResult("alphavantage", result.errorCode ?? "PROVIDER_UNAVAILABLE", result.errorMessage ?? "health failed", result.latencyMs);
  },
  async fetchPrices(symbols) {
    const started = Date.now();
    if (!apiKey) return failureResult("alphavantage", "PROVIDER_AUTH_FAILURE", "ALPHAVANTAGE_API_KEY missing", 0);
    try {
      const prices = await Promise.all(symbols.map(async (symbol) => {
        const data = await requestJson<{ "Global Quote"?: { "05. price"?: string; "07. latest trading day"?: string } }>(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`,
          { retries: 0, timeoutMs: 6_000 },
        );
        const quote = data["Global Quote"];
        const price = Number(quote?.["05. price"] ?? 0);
        if (!Number.isFinite(price) || price <= 0) throw new Error("partial alphavantage data");
        return { symbol, price, timestampMs: Date.now() };
      }));
      return successResult("alphavantage", pointsFromPrices("alphavantage", prices, false, false), Date.now() - started, false);
    } catch (error) {
      const classified = classifyProviderError(error);
      return failureResult("alphavantage", classified.code, classified.message, Date.now() - started);
    }
  },
};
