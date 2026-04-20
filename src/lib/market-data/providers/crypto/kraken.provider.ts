import { requestJson } from "@/lib/market-data/shared/http";
import { classifyProviderError } from "../shared/provider-error-classifier";
import { failureResult, pointsFromPrices, successResult } from "../shared/provider-utils";
import type { MarketProvider } from "@/lib/market-data/core/types";

function toKrakenPair(symbol: string) {
  const base = symbol.replace(/USDT$/, "");
  return `${base}USD`;
}

export const krakenProvider: MarketProvider = {
  id: "kraken-rest",
  market: "crypto",
  priority: 5,
  capabilities: ["batch_price"],
  async healthCheck() {
    const result = await this.fetchPrices(["BTCUSDT"]);
    return result.ok
      ? successResult("kraken-rest", { state: "live" }, result.latencyMs)
      : failureResult("kraken-rest", result.errorCode ?? "PROVIDER_UNAVAILABLE", result.errorMessage ?? "health failed", result.latencyMs);
  },
  async fetchPrices(symbols) {
    const started = Date.now();
    try {
      const prices = await Promise.all(symbols.map(async (symbol) => {
        const pair = toKrakenPair(symbol);
        const data = await requestJson<{ result?: Record<string, { c?: [string] }> }>(
          `https://api.kraken.com/0/public/Ticker?pair=${pair}`,
          { retries: 1, timeoutMs: 4_500 },
        );
        const row = Object.values(data.result ?? {})[0];
        const price = Number(row?.c?.[0] ?? 0);
        if (!Number.isFinite(price) || price <= 0) throw new Error("partial kraken data");
        return { symbol, price, timestampMs: Date.now() };
      }));
      return successResult("kraken-rest", pointsFromPrices("kraken-rest", prices, true, false), Date.now() - started, false);
    } catch (error) {
      const classified = classifyProviderError(error);
      return failureResult("kraken-rest", classified.code, classified.message, Date.now() - started);
    }
  },
};
