import { reconcileLifecycle, transitionLifecycle } from "@/lib/signals/signal-lifecycle";
import type { PublishedSignal } from "@/lib/signals/signal-types";

const baseSignal: PublishedSignal = {
  id: "sig-1",
  symbol: "BTCUSDT",
  market: "crypto",
  direction: "long",
  confidence: 80,
  class: "strong",
  entry: 100,
  stopLoss: 95,
  takeProfit: 110,
  expectedR: 2,
  timestamp: Date.now(),
  regime: { trend: "bullish", volatility: "normal", liquidity: "healthy" },
  scoreBreakdown: { structure: 1, momentum: 1, volume: 1, volatility: 1, trend: 1, derivatives: 1, rr: 1 },
  rationale: [],
  invalidatesOn: [],
  contributors: {},
  dataQuality: "healthy",
  sourceMeta: { primarySource: "okx", priceAgeMs: 100, candleAgeMs: 100, dataState: "live" },
  lifecycleState: "published",
};

describe("signal-lifecycle", () => {
  it("transitions deterministically into open then closed_tp", () => {
    const opened = reconcileLifecycle(baseSignal, 101);
    expect(opened.lifecycleState).toBe("open");

    const closed = reconcileLifecycle(opened, 111);
    expect(closed.lifecycleState).toBe("closed_tp");
  });

  it("rejects illegal transitions", () => {
    expect(() => transitionLifecycle(baseSignal, "closed_tp", "illegal")).toThrow(/illegal lifecycle transition/i);
  });
});
