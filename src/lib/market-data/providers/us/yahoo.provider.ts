import { requestJson } from "@/lib/market-data/shared/http";
import { classifyProviderError } from "../shared/provider-error-classifier";
import { failureResult, pointsFromPrices, successResult } from "../shared/provider-utils";
import type { MarketProvider } from "@/lib/market-data/core/types";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export const yahooUsProvider: MarketProvider = {
  id: "yahoo-us",
  market: "us",
  priority: 1,
  capabilities: ["batch_price", "candles", "metadata"],
  async healthCheck() {
    const result = await this.fetchPrices(["SPY"]);
    return result.ok ? successResult("yahoo-us", { state: "live" }, result.latencyMs) : failureResult("yahoo-us", result.errorCode ?? "PROVIDER_UNAVAILABLE", result.errorMessage ?? "health failed", result.latencyMs);
  },
  async fetchPrices(symbols) {
    const started = Date.now();
    try {
      const prices = await Promise.all(symbols.map(async (symbol) => {
        const data = await requestJson<{ chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; regularMarketTime?: number } }> } }>(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`,
          { retries: 1, timeoutMs: 6_000, headers: { "User-Agent": UA } },
        );
        const meta = data.chart?.result?.[0]?.meta;
        const price = Number(meta?.regularMarketPrice ?? 0);
        const timestampMs = Number(meta?.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000;
        if (!Number.isFinite(price) || price <= 0) throw new Error("partial yahoo data");
        return { symbol, price, timestampMs };
      }));
      return successResult("yahoo-us", pointsFromPrices("yahoo-us", prices, true, false), Date.now() - started, false);
    } catch (error) {
      const classified = classifyProviderError(error);
      return failureResult("yahoo-us", classified.code, classified.message, Date.now() - started);
    }
  },
};
