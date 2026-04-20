import { requestJson } from "@/lib/market-data/shared/http";
import { classifyProviderError } from "../shared/provider-error-classifier";
import { failureResult, pointsFromPrices, successResult } from "../shared/provider-utils";
import type { MarketProvider } from "@/lib/market-data/core/types";

function toOkxInstId(symbol: string) {
  const base = symbol.replace(/USDT$/, "");
  return `${base}-USDT-SWAP`;
}

export const okxProvider: MarketProvider = {
  id: "okx-rest",
  market: "crypto",
  priority: 4,
  capabilities: ["batch_price"],
  async healthCheck() {
    const result = await this.fetchPrices(["BTCUSDT"]);
    return result.ok ? successResult("okx-rest", { state: "live" }, result.latencyMs) : failureResult("okx-rest", result.errorCode ?? "PROVIDER_UNAVAILABLE", result.errorMessage ?? "health failed", result.latencyMs);
  },
  async fetchPrices(symbols) {
    const started = Date.now();
    try {
      const prices = await Promise.all(symbols.map(async (symbol) => {
        const data = await requestJson<{ data: Array<{ last: string; ts: string }> }>(
          `https://www.okx.com/api/v5/market/ticker?instId=${toOkxInstId(symbol)}`,
          { retries: 1, timeoutMs: 4_500 },
        );
        const row = data.data[0];
        return { symbol, price: Number(row.last), timestampMs: Number(row.ts ?? Date.now()) };
      }));
      return successResult("okx-rest", pointsFromPrices("okx-rest", prices, true, false), Date.now() - started, false);
    } catch (error) {
      const classified = classifyProviderError(error);
      return failureResult("okx-rest", classified.code, classified.message, Date.now() - started);
    }
  },
};
