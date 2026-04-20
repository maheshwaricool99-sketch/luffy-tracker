import { getUnifiedPrice } from "@/lib/price-engine";
import { classifyProviderError } from "../shared/provider-error-classifier";
import { failureResult, pointsFromPrices, successResult } from "../shared/provider-utils";
import type { MarketProvider } from "@/lib/market-data/core/types";

export const binanceWsProvider: MarketProvider = {
  id: "binance-ws",
  market: "crypto",
  priority: 1,
  capabilities: ["stream_price", "batch_price"],
  async healthCheck() {
    try {
      const sample = await getUnifiedPrice("BTCUSDT");
      if (!Number.isFinite(sample.price) || sample.price <= 0) {
        return failureResult("binance-ws", "PROVIDER_UNAVAILABLE", "Live websocket price unavailable", sample.ageMs);
      }
      return successResult("binance-ws", { state: sample.ageMs <= 5_000 ? "live" : "degraded" }, sample.ageMs, false);
    } catch (error) {
      const classified = classifyProviderError(error);
      return failureResult("binance-ws", classified.code, classified.message, 0);
    }
  },
  async fetchPrices(symbols) {
    const started = Date.now();
    try {
      const prices = await Promise.all(symbols.map(async (symbol) => {
        const live = await getUnifiedPrice(symbol);
        if (!Number.isFinite(live.price) || live.price <= 0) {
          throw new Error(`Live websocket price unavailable for ${symbol}`);
        }
        return { symbol, price: live.price, timestampMs: live.timestamp };
      }));
      return successResult("binance-ws", pointsFromPrices("binance-ws", prices, true, false), Date.now() - started, false);
    } catch (error) {
      const classified = classifyProviderError(error);
      return failureResult("binance-ws", classified.code, classified.message, Date.now() - started);
    }
  },
};
