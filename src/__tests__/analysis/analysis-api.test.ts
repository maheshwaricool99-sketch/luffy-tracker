import { NextRequest } from "next/server";
import { GET } from "@/app/api/analysis/[symbol]/route";

jest.mock("@/lib/auth/getSessionUser", () => ({
  getSessionUser: jest.fn(async () => null),
}));

jest.mock("@/lib/analysis/mock", () => ({
  buildMockAnalysis: jest.fn(async (symbol: string, market: "CRYPTO" | "US" | "INDIA", timeframe: "1H") => ({
    symbol,
    market,
    timeframe,
    exchange: "Binance",
    assetName: symbol,
    decisionEngine: {
      verdict: "LONG",
      confidencePct: 70,
      finalScore: 7,
      riskGrade: "B+",
      timeHorizon: "SWING",
      summary: "test",
      confidenceBreakdown: { trend: 20, volume: 20, structure: 20, indicators: 15, marketContext: 15, onChainFlow: 10 },
      generatedAt: new Date().toISOString(),
    },
    mtfConfluence: { rows: [], alignedCount: 0, totalCells: 0, aggregateVerdict: "LONG" },
    chart: { candles: [], zones: [], annotations: [], currentPrice: 0 },
    tradePlan: { direction: "LONG", entryPrice: null, stopLoss: null, takeProfits: [], riskRewardRatio: null },
    indicators: [],
    patterns: [],
    marketContext: { trend: "NEUTRAL", volatility: "NORMAL", sentimentLabel: "Neutral", liquidity: "NORMAL" },
    onChain: null,
    orderFlow: null,
    orderBook: null,
    smartMoney: null,
    events: [],
    newsAndCatalysts: null,
    correlation: null,
    scenarios: null,
    explanation: { title: "test", bullets: [], invalidation: "test", totalBulletCount: 0 },
    riskAnalysis: { probabilityOfSuccessPct: null, maxDrawdownPct: null, volatilityRisk: "LOW", newsRisk: "LOW", eventRisk: "LOW", correlationRisk: "LOW", notes: [] },
    historicalEdge: null,
    liveStatus: { status: "WATCHING", currentPrice: null, distanceToEntryPct: null, signalGeneratedAt: null, updatedAt: null, isLive: false, isStale: true },
    freshness: {
      price: { status: "DELAYED", lastUpdatedAt: new Date().toISOString() },
      chart: { status: "DELAYED", lastUpdatedAt: new Date().toISOString() },
      orderFlow: { status: "DELAYED", lastUpdatedAt: new Date().toISOString() },
      orderBook: { status: "DELAYED", lastUpdatedAt: new Date().toISOString() },
      onChain: { status: "DELAYED", lastUpdatedAt: new Date().toISOString() },
      news: { status: "DELAYED", lastUpdatedAt: new Date().toISOString() },
      events: { status: "DELAYED", lastUpdatedAt: new Date().toISOString() },
    },
    entitlements: {
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
    },
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10_000).toISOString(),
  })),
}));

describe("analysis api route", () => {
  it("returns 400 for invalid symbol", async () => {
    const req = new NextRequest("http://localhost/api/analysis/!!bad!!?timeframe=1H");
    const response = await GET(req, { params: Promise.resolve({ symbol: "!!bad!!" }) });
    expect(response.status).toBe(400);
  });

  it("returns analysis payload for supported symbol", async () => {
    const req = new NextRequest("http://localhost/api/analysis/BTCUSDT?timeframe=1H");
    const response = await GET(req, { params: Promise.resolve({ symbol: "BTCUSDT" }) });
    expect(response.status).toBe(200);
    const payload = await response.json() as { symbol: string; market: string; decisionEngine?: { verdict: string } };
    expect(payload.symbol).toBe("BTCUSDT");
    expect(payload.market).toBe("CRYPTO");
    expect(payload.decisionEngine?.verdict).toBeDefined();
  });
});
