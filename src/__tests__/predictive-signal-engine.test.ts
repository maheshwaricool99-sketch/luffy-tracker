import { buildPredictiveSignalsForUniverse, debugPredictiveFeatures } from "@/lib/predictive-signal-engine";
import { getUnifiedPrice, injectTestPrice, resetPriceEngineForTests } from "@/lib/price-engine";

describe("predictive signal engine", () => {
  beforeEach(() => {
    resetPriceEngineForTests();
  });

  it("generates an early signal before breakout when price stays flat and activity builds", async () => {
    const now = Date.now();
    for (let i = 0; i < 15; i += 1) {
      injectTestPrice("TESTUSDT", 100 + (i % 2 === 0 ? 0.05 : -0.04), "binance-ws", now - (30 - i) * 60_000, 10_000 + i * 25);
    }
    const accumulationTape = [
      100.00, 100.02, 99.99, 100.03, 100.01,
      100.04, 100.00, 100.05, 100.02, 100.06,
      100.04, 100.07, 100.05, 100.09, 100.11,
    ];
    accumulationTape.forEach((price, i) => {
      injectTestPrice("TESTUSDT", price, "binance-ws", now - (15 - i) * 60_000, 10_600 + i * 260);
    });
    injectTestPrice("TESTUSDT", 100.12, "binance-ws", now - 500, 14_700);

    const features = await debugPredictiveFeatures("TESTUSDT");
    expect(features?.rsiValue ?? 100).toBeLessThanOrEqual(75);
    const signals = await buildPredictiveSignalsForUniverse("advanced", "4h", ["TESTUSDT"]);
    expect(signals).toHaveLength(1);
    expect(signals[0]?.signalTiming).toBe("EARLY SIGNAL");
    expect(signals[0]?.pumpProbabilityScore).toBeGreaterThan(70);
  });

  it("rejects symbols that already moved too far", async () => {
    const now = Date.now();
    for (let i = 0; i < 15; i += 1) {
      injectTestPrice("PUMPUSDT", 100 + i * 1.6, "binance-ws", now - (15 - i) * 60_000, 20_000 + i * 600);
    }

    const signals = await buildPredictiveSignalsForUniverse("advanced", "4h", ["PUMPUSDT"]);
    expect(signals).toHaveLength(0);
  });

  it("falls back from stale primary ws price to a secondary ws source", async () => {
    const now = Date.now();
    injectTestPrice("ALTUSDT", 101, "binance-ws", now - 4_500, 10_000);
    injectTestPrice("ALTUSDT", 100.8, "bybit-spot-ws", now - 400, 10_050);

    const price = await getUnifiedPrice("ALTUSDT");
    expect(price.source).toBe("bybit-spot-ws");
    expect(price.ageMs).toBeLessThan(2_000);
  });
});
