import { runPublishGuard } from "@/lib/validation/publish-guard";
import { upsertSignal, clearSignalStore } from "@/lib/signals/signal-store";
import type { AggregatedSignalCandidate, SignalFeatureContext, PublishedSignal } from "@/lib/signals/signal-types";

const context: SignalFeatureContext = {
  symbol: "BTCUSDT",
  market: "crypto",
  priceSnapshot: {
    symbol: "BTCUSDT",
    marketId: "crypto",
    price: 70000,
    bid: 69999,
    ask: 70001,
    tsExchange: Date.now(),
    tsReceived: Date.now(),
    ageMs: 800,
    source: "okx",
    priceSource: "okx",
    stale: false,
    freshness: "GOOD",
    fallback: "binance",
    dataAvailable: true,
    error: null,
    currency: "USDT",
  },
  candles: Array.from({ length: 5 }, (_, index) => ({
    ts: Date.now() - (4 - index) * 60_000,
    open: 10,
    high: 11,
    low: 9,
    close: 10.5,
    volume: 100,
  })),
  candleAgeMs: 500,
  structure: { score: 18, compressionPct: 0.7, equalZoneHits: 4, movePct: 2, trendShift: 1 },
  momentumScore: 70,
  volume: { ratio: 2, anomalyScore: 18, recentAvg: 20, baselineAvg: 10 },
  catalystScore: 10,
  whaleScore: 12,
  derivativesScore: 10,
  regime: { trend: "bullish", volatility: "normal", liquidity: "healthy" },
  expectedR: 1.9,
  entry: 70000,
  stopLoss: 69000,
  takeProfit: 71900,
  rationaleInputs: [],
  invalidatesOn: [],
};

const candidate: AggregatedSignalCandidate = {
  symbol: "BTCUSDT",
  market: "crypto",
  direction: "long",
  finalScore: 82,
  confidence: 84,
  timestamp: Date.now(),
  contributors: {
    continuation_model: 80,
    breakout_model: 78,
  },
  scoreBreakdown: {
    structure: 74,
    momentum: 71,
    volume: 68,
    volatility: 61,
    trend: 73,
    derivatives: 66,
    rr: 78,
    disagreementPenalty: 0,
  },
  rationaleInputs: [],
  validationFlags: [],
  expectedR: 1.9,
  dataQuality: "healthy",
};

describe("publish-guard", () => {
  beforeEach(() => clearSignalStore());

  it("blocks stale price data", () => {
    const result = runPublishGuard(candidate, {
      ...context,
      priceSnapshot: { ...context.priceSnapshot, ageMs: 6_000, freshness: "REJECT", stale: true },
    }, true, false);
    expect(result.ok).toBe(false);
    expect(result.flags).toContain("stale-data");
  });

  it("blocks duplicate active symbol", () => {
    upsertSignal({
      id: "existing",
      symbol: "BTCUSDT",
      market: "crypto",
      direction: "long",
      confidence: 90,
      class: "elite",
      entry: 1,
      stopLoss: 0.9,
      takeProfit: 1.2,
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
    } satisfies PublishedSignal);
    const result = runPublishGuard(candidate, context, true, false);
    expect(result.ok).toBe(false);
    expect(result.flags).toContain("duplicate-active-signal");
  });
});
