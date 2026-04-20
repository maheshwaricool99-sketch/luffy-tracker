import { aggregateModelOutputs } from "@/lib/signals/signal-aggregator";
import type { ModelOutput, SignalFeatureContext } from "@/lib/signals/signal-types";

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
    ageMs: 500,
    source: "okx",
    priceSource: "okx",
    stale: false,
    freshness: "GOOD",
    fallback: "binance",
    dataAvailable: true,
    error: null,
    currency: "USDT",
  },
  candles: [{ ts: Date.now(), open: 1, high: 1, low: 1, close: 1, volume: 1 }],
  candleAgeMs: 500,
  structure: { score: 18, compressionPct: 0.8, equalZoneHits: 4, movePct: 2, trendShift: 1 },
  momentumScore: 66,
  volume: { ratio: 1.8, anomalyScore: 16, recentAvg: 10, baselineAvg: 5 },
  catalystScore: 12,
  whaleScore: 9,
  derivativesScore: 11,
  regime: { trend: "bullish", volatility: "normal", liquidity: "healthy" },
  expectedR: 1.9,
  entry: 70000,
  stopLoss: 69000,
  takeProfit: 71900,
  rationaleInputs: [],
  invalidatesOn: [],
};

function output(
  sourceModel: NonNullable<ModelOutput["meta"]>["sourceModel"],
  direction: "long" | "short",
  confidence: number,
  strength = 80,
): ModelOutput {
  return {
    symbol: "BTCUSDT",
    market: "crypto",
    direction,
    strength,
    confidence,
    timestamp: Date.now(),
    features: {
      structure: 70,
      momentum: 65,
      volume: 60,
      volatility: 55,
      trend: 72,
      derivatives: 68,
    },
    meta: { sourceModel },
  };
}

describe("signal-aggregator", () => {
  it("publishes a candidate when at least two models agree", () => {
    const candidate = aggregateModelOutputs([
      output("continuation_model", "long", 84),
      output("breakout_model", "long", 79),
      output("high_confidence_filter", "long", 88),
    ], context);

    expect(candidate).not.toBeNull();
    expect(candidate?.direction).toBe("long");
    expect(candidate?.finalScore).toBeGreaterThanOrEqual(70);
  });

  it("rejects equal long-short split", () => {
    const candidate = aggregateModelOutputs([
      output("continuation_model", "long", 80),
      output("high_confidence_filter", "short", 80),
      output("breakout_model", "long", 20),
      output("reversal_model", "short", 20),
    ], context);

    expect(candidate).toBeNull();
  });
});
