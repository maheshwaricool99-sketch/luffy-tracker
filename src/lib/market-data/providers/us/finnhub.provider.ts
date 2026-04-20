import { requestJson } from "@/lib/market-data/shared/http";
import { classifyProviderError } from "../shared/provider-error-classifier";
import { failureResult, pointsFromPrices, successResult } from "../shared/provider-utils";
import type { MarketProvider } from "@/lib/market-data/core/types";

const apiKey = process.env.FINNHUB_API_KEY;

export const finnhubProvider: MarketProvider = {
  id: "finnhub",
  market: "us",
  priority: 3,
  capabilities: ["batch_price"],
  async healthCheck() {
    if (!apiKey) return failureResult("finnhub", "PROVIDER_AUTH_FAILURE", "FINNHUB_API_KEY missing", 0);
    const result = await this.fetchPrices(["SPY"]);
    return result.ok ? successResult("finnhub", { state: "live" }, result.latencyMs) : failureResult("finnhub", result.errorCode ?? "PROVIDER_UNAVAILABLE", result.errorMessage ?? "health failed", result.latencyMs);
  },
  async fetchPrices(symbols) {
    const started = Date.now();
    if (!apiKey) return failureResult("finnhub", "PROVIDER_AUTH_FAILURE", "FINNHUB_API_KEY missing", 0);
    try {
      const prices = await Promise.all(symbols.map(async (symbol) => {
        const data = await requestJson<{ c?: number; t?: number }>(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
          { retries: 0, timeoutMs: 6_000 },
        );
        const price = Number(data.c ?? 0);
        if (!Number.isFinite(price) || price <= 0) throw new Error("partial finnhub data");
        return { symbol, price, timestampMs: Number(data.t ?? Math.floor(Date.now() / 1000)) * 1000 };
      }));
      return successResult("finnhub", pointsFromPrices("finnhub", prices, false, false), Date.now() - started, false);
    } catch (error) {
      const classified = classifyProviderError(error);
      return failureResult("finnhub", classified.code, classified.message, Date.now() - started);
    }
  },
};
