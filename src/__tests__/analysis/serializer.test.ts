import { serializeAnalysisForEntitlements } from "@/lib/analysis/serializer";
import type { AiAnalysisResponse, AnalysisEntitlements } from "@/lib/analysis/types";

const GUEST: AnalysisEntitlements = {
  canViewFullTradePlan: false,
  canViewAdvancedReasoning: false,
  canViewRealtime: false,
  canViewHistoricalEdge: false,
  canViewOnChain: false,
  canViewOrderFlow: false,
  canViewOrderBook: false,
  canViewSmartMoney: false,
  canViewScenarios: false,
  canViewMtfConfluence: false,
  canViewEventAlerts: true,
  canViewDeepEvents: false,
  canCreateAlerts: false,
  maxAlertsCount: 0,
  canExportData: false,
};

const PREMIUM: AnalysisEntitlements = {
  ...GUEST,
  canViewFullTradePlan: true,
  canViewAdvancedReasoning: true,
  canViewRealtime: true,
  canViewHistoricalEdge: true,
  canViewOnChain: true,
  canViewOrderFlow: true,
  canViewOrderBook: true,
  canViewSmartMoney: true,
  canViewScenarios: true,
  canViewMtfConfluence: true,
  canViewDeepEvents: true,
  canCreateAlerts: true,
  maxAlertsCount: 50,
  canExportData: true,
};

function basePayload(): AiAnalysisResponse {
  return {
    symbol: "BTCUSDT",
    market: "CRYPTO",
    timeframe: "1H",
    exchange: "Binance",
    assetName: "Bitcoin",
    decisionEngine: {
      verdict: "LONG",
      confidencePct: 71,
      finalScore: 7.1,
      riskGrade: "B+",
      timeHorizon: "SWING",
      summary: "Test payload",
      confidenceBreakdown: { trend: 20, volume: 20, structure: 20, indicators: 15, marketContext: 15, onChainFlow: 10 },
      generatedAt: new Date().toISOString(),
    },
    mtfConfluence: {
      rows: [
        { metric: "trend", cells: [{ timeframe: "1H", signal: "BULLISH", label: "Bullish", strength: "MEDIUM" }] },
        { metric: "momentum", cells: [{ timeframe: "1H", signal: "BULLISH", label: "Bullish", strength: "MEDIUM" }] },
      ],
      alignedCount: 1,
      totalCells: 2,
      aggregateVerdict: "LONG",
    },
    chart: {
      candles: [{ time: 1, open: 100, high: 110, low: 95, close: 108, volume: 10 }],
      ema20: [{ time: 1, value: 105 }],
      ema50: [{ time: 1, value: 103 }],
      ema200: [{ time: 1, value: 99 }],
      vwap: [{ time: 1, value: 104 }],
      zones: [{ id: "z1", type: "SUPPORT", label: "S", priceMin: 96, priceMax: 99, strength: "STRONG" }],
      annotations: [{ id: "a1", type: "LABEL", label: "L", time: 1, price: 108, priority: "HIGH" }],
      currentPrice: 108,
    },
    tradePlan: {
      direction: "LONG",
      entryPrice: 108,
      stopLoss: 101,
      takeProfits: [
        { level: 1, price: 112, rMultiple: 1.3 },
        { level: 2, price: 115, rMultiple: 2.1 },
        { level: 3, price: 118, rMultiple: 3.1 },
      ],
      riskRewardRatio: 2.1,
      trailingStop: { type: "ATR", value: 1.5 },
    },
    indicators: [{ name: "RSI", signal: "Bullish", strength: "MEDIUM", vote: 1 }],
    patterns: [{ name: "Ascending", status: "CONFIRMED", description: "Pattern", timeframe: "1H" }],
    marketContext: { trend: "BULLISH", volatility: "NORMAL", sentimentLabel: "Optimistic", liquidity: "HIGH" },
    onChain: { market: "CRYPTO", exchangeNetflow24hUsd: 1, whaleTxCount24h: 2, source: "test", updatedAt: new Date().toISOString() },
    orderFlow: { bidAskImbalancePct: 15, liquidationClusters: [] },
    orderBook: { bids: [], asks: [], spreadBps: 1.1, midPrice: 108, updatedAt: new Date().toISOString() },
    smartMoney: { cvdDivergence: false, absorptionAtSupport: true, spoofingPressure: "NONE", deltaImbalanceUsd: 1, institutionalFlowSeries: [] },
    events: [
      { id: "e1", kind: "SUPPLY_UNLOCK", severity: "HIGH", symbol: "BTCUSDT", title: "Unlock", description: "Unlock", impact: "BEARISH", metadata: {}, source: "test" },
      { id: "e2", kind: "VOLUME_ANOMALY", severity: "MEDIUM", symbol: "BTCUSDT", title: "Volume", description: "Volume", impact: "BULLISH", metadata: {}, source: "test" },
    ],
    newsAndCatalysts: { news: [], catalysts: [], aggregateNewsScore: 0.1, socialSentimentDeltaPct: 1.2 },
    correlation: { pairs: [], regime: { label: "Risk-on", confidencePct: 60, description: "test" } },
    scenarios: { horizon: "7d", scenarios: [], distributionHistogram: [] },
    explanation: { title: "Why", bullets: ["A", "B", "C"], invalidation: "Below support", totalBulletCount: 3 },
    riskAnalysis: { probabilityOfSuccessPct: 60, maxDrawdownPct: 5, volatilityRisk: "MEDIUM", newsRisk: "LOW", eventRisk: "MEDIUM", correlationRisk: "LOW", notes: [] },
    historicalEdge: { winRatePct: 58, avgRiskReward: 1.7, avgDurationMinutes: 300, totalSignals: 100, sampleSizeLabel: "n=100", last20Outcomes: [], cumulativeReturnPct: 22, expectancyR: 0.32 },
    liveStatus: { status: "ACTIVE", currentPrice: 108.42, distanceToEntryPct: 0.4, signalGeneratedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isLive: true, isStale: false },
    freshness: {
      price: { status: "LIVE", lastUpdatedAt: new Date().toISOString() },
      chart: { status: "LIVE", lastUpdatedAt: new Date().toISOString() },
      orderFlow: { status: "LIVE", lastUpdatedAt: new Date().toISOString() },
      orderBook: { status: "LIVE", lastUpdatedAt: new Date().toISOString() },
      onChain: { status: "LIVE", lastUpdatedAt: new Date().toISOString() },
      news: { status: "LIVE", lastUpdatedAt: new Date().toISOString() },
      events: { status: "LIVE", lastUpdatedAt: new Date().toISOString() },
    },
    entitlements: PREMIUM,
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10_000).toISOString(),
  };
}

describe("analysis serializer", () => {
  it("masks premium fields for guest", () => {
    const masked = serializeAnalysisForEntitlements(basePayload(), GUEST);
    expect(masked.tradePlan.takeProfits).toHaveLength(1);
    expect(masked.explanation.bullets).toHaveLength(1);
    expect(masked.onChain).toBeNull();
    expect(masked.orderFlow).toBeNull();
    expect(masked.orderBook).toBeNull();
    expect(masked.smartMoney).toBeNull();
    expect(masked.scenarios).toBeNull();
    expect(masked.historicalEdge).toBeNull();
    expect(masked.liveStatus.isLive).toBe(false);
    expect(masked.freshness.price.status).toBe("DELAYED");
    expect(masked.events.some((event) => event.kind === "SUPPLY_UNLOCK")).toBe(false);
  });

  it("keeps full payload for premium", () => {
    const masked = serializeAnalysisForEntitlements(basePayload(), PREMIUM);
    expect(masked.tradePlan.takeProfits.length).toBeGreaterThanOrEqual(3);
    expect(masked.onChain).not.toBeNull();
    expect(masked.orderFlow).not.toBeNull();
    expect(masked.events.some((event) => event.kind === "SUPPLY_UNLOCK")).toBe(true);
  });
});
