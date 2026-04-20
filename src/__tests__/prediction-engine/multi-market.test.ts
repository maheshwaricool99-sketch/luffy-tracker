import { resetPriceEngineForTests } from "@/lib/price-engine";
import { resetProviderCacheForTests } from "@/lib/market-data/cache/provider-cache";
import { clearSnapshotRecordsForTests } from "@/lib/market-data/cache/snapshot-cache";
import { resetProviderManagersForTests } from "@/lib/market-data/managers/provider-manager";
import { resetRecoveryControllerForTests } from "@/lib/market-data/recovery/recovery-controller";
import { clearMarketUniverseCache, primeMarketUniverse } from "@/lib/market-data/shared/symbols";
import { clearPriceSnapshotCache, getSnapshot } from "@/lib/market-data/shared/price-service";
import { getMarketUniverse } from "@/lib/market-data/shared/symbols";
import type { MarketSymbolInfo } from "@/lib/market-data/shared/types";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("market data foundation", () => {
  beforeEach(() => {
    clearMarketUniverseCache();
    clearPriceSnapshotCache();
    clearSnapshotRecordsForTests();
    resetProviderCacheForTests();
    resetProviderManagersForTests();
    resetPriceEngineForTests();
    resetRecoveryControllerForTests();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    resetRecoveryControllerForTests();
  });

  it("fetches 100+ crypto symbols dynamically", async () => {
    const symbols = Array.from({ length: 120 }, (_, index) => ({
      symbol: `COIN${index}USDT`,
      pair: `COIN${index}USDT`,
      contractType: "PERPETUAL",
      quoteAsset: "USDT",
      status: "TRADING",
      baseAsset: `COIN${index}`,
    }));
    jest.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse({ symbols }) as unknown as Promise<Response>,
    );

    const universe = await getMarketUniverse("crypto");
    expect(universe.length).toBeGreaterThanOrEqual(100);
    expect(universe[0]?.marketId).toBe("crypto");
  });

  it("falls back from binance symbol discovery to okx", async () => {
    jest.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("fapi.binance.com")) {
        return new Response("restricted", { status: 451 });
      }
      if (url.includes("okx.com/api/v5/public/instruments")) {
        return jsonResponse({
          data: Array.from({ length: 140 }, (_, index) => ({
            instId: `COIN${index}-USDT-SWAP`,
            settleCcy: "USDT",
            state: "live",
          })),
        }) as unknown as Response;
      }
      throw new Error(`unexpected url ${url}`);
    });

    const universe = await getMarketUniverse("crypto");
    expect(universe.length).toBeGreaterThanOrEqual(100);
    expect(universe[0]?.symbol).toMatch(/USDT$/);
  });

  it("falls back from binance to okx and tags the source", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("fapi.binance.com")) {
        return new Response("restricted", { status: 451 });
      }
      if (url.includes("okx.com")) {
        return jsonResponse({
          data: [{ last: "68000", bidPx: "67999", askPx: "68001", ts: String(Date.now()) }],
        }) as unknown as Response;
      }
      throw new Error(`unexpected url ${url}`);
    });

    primeMarketUniverse("crypto", [{ symbol: "BTCUSDT", marketId: "crypto", name: "Bitcoin", currency: "USDT" } satisfies MarketSymbolInfo]);
    const snapshot = await getSnapshot("BTCUSDT", "crypto");
    expect(snapshot.priceSource).toBe("okx");
    expect(snapshot.dataAvailable).toBe(true);
    fetchMock.mockRestore();
  });

  it("keeps identical tickers isolated across markets", async () => {
    primeMarketUniverse("us", [{ symbol: "TCS", marketId: "us", name: "Container Store", currency: "USD" } satisfies MarketSymbolInfo]);
    primeMarketUniverse("india", [{ symbol: "TCS", marketId: "india", name: "Tata Consultancy Services", currency: "INR", benchmark: "NIFTY" } satisfies MarketSymbolInfo]);

    jest.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/chart/TCS.NS")) {
        return jsonResponse({ chart: { result: [{ meta: { regularMarketPrice: 4000, bid: 3998, ask: 4002, regularMarketTime: Math.floor(Date.now() / 1000) } }] } }) as unknown as Response;
      }
      if (url.includes("/chart/TCS?")) {
        return jsonResponse({ chart: { result: [{ meta: { regularMarketPrice: 12, bid: 11.9, ask: 12.1, regularMarketTime: Math.floor(Date.now() / 1000) } }] } }) as unknown as Response;
      }
      throw new Error(`unexpected url ${url}`);
    });

    const us = await getSnapshot("TCS", "us");
    const india = await getSnapshot("TCS", "india");
    expect(us.currency).toBe("USD");
    expect(india.currency).toBe("INR");
    expect(us.price).not.toBe(india.price);
  });

  it("rejects unavailable data instead of returning fake numbers", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));
    primeMarketUniverse("crypto", [{ symbol: "BTCUSDT", marketId: "crypto", name: "Bitcoin", currency: "USDT" } satisfies MarketSymbolInfo]);
    await expect(getSnapshot("BTCUSDT", "crypto")).rejects.toThrow(/data unavailable/i);
  });
});
