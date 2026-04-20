import { requestJson } from "@/lib/market-data/shared/http";
import { classifyProviderError } from "../shared/provider-error-classifier";
import { failureResult, pointsFromPrices, successResult } from "../shared/provider-utils";
import type { MarketProvider } from "@/lib/market-data/core/types";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export const yahooIndiaProvider: MarketProvider = {
  id: "yahoo-india",
  market: "india",
  priority: 2,
  capabilities: ["batch_price"],
  async healthCheck() {
    const result = await this.fetchPrices(["RELIANCE"]);
    return result.ok ? successResult("yahoo-india", { state: "live" }, result.latencyMs) : failureResult("yahoo-india", result.errorCode ?? "PROVIDER_UNAVAILABLE", result.errorMessage ?? "health failed", result.latencyMs);
  },
  async fetchPrices(symbols) {
    const started = Date.now();
    try {
      const prices = await Promise.all(symbols.map(async (symbol) => {
        const data = await requestJson<{ chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; regularMarketTime?: number } }> } }>(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(`${symbol}.NS`)}?interval=1m&range=1d`,
          { retries: 1, timeoutMs: 6_500, headers: { "User-Agent": UA } },
        );
        const meta = data.chart?.result?.[0]?.meta;
        const price = Number(meta?.regularMarketPrice ?? 0);
        if (!Number.isFinite(price) || price <= 0) throw new Error("invalid yahoo india response");
        return { symbol, price, timestampMs: Number(meta?.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000 };
      }));
      return successResult("yahoo-india", pointsFromPrices("yahoo-india", prices, false, false), Date.now() - started, false);
    } catch (error) {
      const classified = classifyProviderError(error);
      return failureResult("yahoo-india", classified.code, classified.message, Date.now() - started);
    }
  },
};
