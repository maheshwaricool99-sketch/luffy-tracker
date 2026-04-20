import { getSnapshot } from "@/lib/market-data/shared/price-service";
import { getDb } from "@/lib/db";
import type {
  AiAnalysisResponse,
  AnalysisEntitlements,
  ChartCandle,
  CorrelationMatrix,
  EventAlert,
  Market,
  Timeframe,
  Trend,
  Verdict,
} from "./types";
import { marketExchange } from "./market-router";

function nowIso() {
  return new Date().toISOString();
}

function withMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function seededNoise(index: number) {
  const x = Math.sin(index * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function verdictFromTrend(trend: Trend): Verdict {
  if (trend === "BULLISH") return "LONG";
  if (trend === "BEARISH") return "SHORT";
  return "NEUTRAL";
}

function canonicalDirectionFromSignals(symbol: string): "LONG" | "SHORT" | null {
  try {
    const row = getDb().prepare(`
      SELECT direction
      FROM signal_records
      WHERE symbol = ?
      ORDER BY published_at DESC
      LIMIT 1
    `).get(symbol) as { direction?: string } | undefined;
    if (!row?.direction) return null;
    const upper = String(row.direction).toUpperCase();
    if (upper === "LONG") return "LONG";
    if (upper === "SHORT") return "SHORT";
    return null;
  } catch {
    return null;
  }
}

async function getSnapshotWithTimeout(symbol: string, market: Market, timeoutMs = 350) {
  const timeoutPromise = new Promise<null>((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    // keep timer from holding process open in tests
    if (typeof timer === "object" && "unref" in timer && typeof timer.unref === "function") {
      timer.unref();
    }
  });

  const snapshotPromise = getSnapshot(symbol, market.toLowerCase() as "crypto" | "us" | "india")
    .then((snapshot) => snapshot ?? null)
    .catch(() => null);

  return Promise.race([snapshotPromise, timeoutPromise]);
}

function buildCandles(base: number, timeframe: Timeframe): ChartCandle[] {
  const count = timeframe === "5m" ? 160 : timeframe === "15m" ? 140 : timeframe === "1H" ? 120 : timeframe === "4H" ? 90 : timeframe === "1D" ? 90 : 80;
  const now = new Date();
  const stepMin = timeframe === "5m" ? 5 : timeframe === "15m" ? 15 : timeframe === "1H" ? 60 : timeframe === "4H" ? 240 : timeframe === "1D" ? 1440 : 7 * 1440;

  let prev = base;
  const candles: ChartCandle[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const t = withMinutes(now, -i * stepMin);
    const drift = (seededNoise(i) - 0.48) * base * 0.0025;
    const open = prev;
    const close = Math.max(0.0001, open + drift);
    const wickUp = Math.max(open, close) + base * (0.0007 + seededNoise(i + 2) * 0.0018);
    const wickDown = Math.min(open, close) - base * (0.0007 + seededNoise(i + 3) * 0.0018);
    const high = Math.max(wickUp, open, close);
    const low = Math.max(0.0001, Math.min(wickDown, open, close));
    candles.push({
      time: Math.floor(t.getTime() / 1000),
      open,
      high,
      low,
      close,
      volume: Math.round(1_000_000 + seededNoise(i + 10) * 4_000_000),
    });
    prev = close;
  }
  return candles;
}

function ema(candles: ChartCandle[], period: number) {
  if (candles.length === 0) return [] as Array<{ time: number; value: number }>;
  const alpha = 2 / (period + 1);
  let value = candles[0].close;
  return candles.map((c) => {
    value = alpha * c.close + (1 - alpha) * value;
    return { time: c.time, value };
  });
}

function correlation(market: Market): CorrelationMatrix {
  if (market === "CRYPTO") {
    return {
      regime: { label: "Risk-on, high beta", confidencePct: 72, description: "Crypto beta is elevated and correlated with US tech." },
      pairs: [
        { symbol: "BTC", correlation: 1, period: "30d" },
        { symbol: "ETH", correlation: 0.84, period: "30d" },
        { symbol: "NASDAQ", correlation: 0.58, period: "30d" },
        { symbol: "DXY", correlation: -0.43, period: "30d" },
      ],
    };
  }
  if (market === "US") {
    return {
      regime: { label: "Index-led trend", confidencePct: 69, description: "Macro beta remains dominant." },
      pairs: [
        { symbol: "SPX", correlation: 0.79, period: "30d" },
        { symbol: "QQQ", correlation: 0.74, period: "30d" },
        { symbol: "DXY", correlation: -0.31, period: "30d" },
      ],
    };
  }
  return {
    regime: { label: "Local macro mixed", confidencePct: 64, description: "Index trend is stable with selective sector rotation." },
    pairs: [
      { symbol: "NIFTY", correlation: 0.82, period: "30d" },
      { symbol: "BANKNIFTY", correlation: 0.63, period: "30d" },
      { symbol: "USDINR", correlation: -0.28, period: "30d" },
    ],
  };
}

function mockEvents(symbol: string, market: Market): EventAlert[] {
  const base: EventAlert[] = [
    {
      id: `${symbol}-event-vol`,
      kind: "VOLUME_ANOMALY",
      severity: "HIGH",
      symbol,
      title: "Volume anomaly detected",
      description: "Current intraday volume is 2.8x the 20-session average.",
      impact: "BULLISH",
      occurredAt: new Date(Date.now() - 26 * 60_000).toISOString(),
      metadata: { volumeMultiple: 2.8 },
      source: "analysis-engine",
    },
    {
      id: `${symbol}-event-liq`,
      kind: "LIQUIDATION_CLUSTER",
      severity: "MEDIUM",
      symbol,
      title: "Nearby liquidation pocket",
      description: "Cluster estimated above current price; possible squeeze trigger.",
      impact: "NEUTRAL",
      occurredAt: new Date(Date.now() - 11 * 60_000).toISOString(),
      metadata: { clusterDistancePct: 1.4 },
      source: "coinalyze",
    },
  ];

  if (market === "CRYPTO") {
    base.unshift({
      id: `${symbol}-event-unlock`,
      kind: "SUPPLY_UNLOCK",
      severity: "CRITICAL",
      symbol,
      title: "Supply unlock in 6 days",
      description: "$142M token unlock, 4.2% of circulating float.",
      impact: "BEARISH",
      scheduledFor: new Date(Date.now() + 6 * 24 * 60 * 60_000).toISOString(),
      valueUsd: 142_000_000,
      metadata: { floatPct: 4.2 },
      source: "tokenunlocks",
    });
  }

  if (market === "US") {
    base.unshift({
      id: `${symbol}-event-insider`,
      kind: "INSIDER_TRADE",
      severity: "HIGH",
      symbol,
      title: "Insider filing posted",
      description: "Recent Form 4 filing indicates net executive buying.",
      impact: "BULLISH",
      occurredAt: new Date(Date.now() - 9 * 60 * 60_000).toISOString(),
      metadata: { filingType: "Form4" },
      source: "sec-edgar",
    });
  }

  if (market === "INDIA") {
    base.unshift({
      id: `${symbol}-event-fii`,
      kind: "FII_DII_FLOW",
      severity: "HIGH",
      symbol,
      title: "FII net outflow day",
      description: "FII outflow intensified while DII support remained moderate.",
      impact: "BEARISH",
      occurredAt: new Date(Date.now() - 4 * 60 * 60_000).toISOString(),
      metadata: { fiiNetUsd: -182_000_000 },
      source: "nse",
    });
  }

  return base;
}

export async function buildMockAnalysis(symbol: string, market: Market, timeframe: Timeframe, entitlements: AnalysisEntitlements): Promise<AiAnalysisResponse> {
  const snapshot = await getSnapshotWithTimeout(symbol, market);
  const basePrice = snapshot?.price && snapshot.price > 0
    ? snapshot.price
    : market === "CRYPTO"
      ? 62_500
      : market === "US"
        ? 215
        : 2_860;

  const candles = buildCandles(basePrice, timeframe);
  const ema20 = ema(candles, 20);
  const ema50 = ema(candles, 50);
  const ema200 = ema(candles, 200);
  const trend: Trend = ema20[ema20.length - 1]?.value > ema50[ema50.length - 1]?.value ? "BULLISH" : "BEARISH";
  const defaultVerdict = verdictFromTrend(trend);
  const canonicalDirection = canonicalDirectionFromSignals(symbol);
  const verdict: Verdict =
    canonicalDirection === "LONG"
      ? "LONG"
      : canonicalDirection === "SHORT"
        ? "SHORT"
        : defaultVerdict;
  const now = nowIso();
  const current = candles[candles.length - 1]?.close ?? basePrice;

  return {
    symbol,
    market,
    timeframe,
    exchange: marketExchange(market),
    assetName: symbol,
    decisionEngine: {
      verdict,
      confidencePct: 73,
      finalScore: 7.4,
      riskGrade: "B+",
      timeHorizon: timeframe === "5m" || timeframe === "15m" ? "INTRADAY" : "SWING",
      summary: `${symbol} shows ${verdict === "SHORT" ? "bearish" : verdict === "LONG" ? "bullish" : "neutral"} structure alignment with moderate continuation probability.`,
      confidenceBreakdown: {
        trend: 28,
        volume: 14,
        structure: 19,
        indicators: 16,
        marketContext: 12,
        onChainFlow: 11,
      },
      generatedAt: now,
    },
    mtfConfluence: {
      rows: ["trend", "momentum", "structure", "volume", "orderFlow"].map((metric) => ({
        metric: metric as "trend" | "momentum" | "structure" | "volume" | "orderFlow",
        cells: ["5m", "15m", "1H", "4H", "1D", "1W"].map((tf, idx) => ({
          timeframe: tf as Timeframe,
          signal: idx <= 3 ? trend : "NEUTRAL",
          label: idx <= 3 ? (trend === "BULLISH" ? "Bullish" : "Bearish") : "Mixed",
          strength: idx <= 2 ? "STRONG" : idx <= 4 ? "MEDIUM" : "WEAK",
          value: 50 + idx * 5,
        })),
      })),
      alignedCount: 4,
      totalCells: 6,
      aggregateVerdict: verdict,
    },
    chart: {
      candles,
      ema20,
      ema50,
      ema200,
      vwap: ema(candles, 34),
      currentPrice: current,
      zones: [
        { id: "sup-1", type: "SUPPORT", label: "Support Zone", priceMin: current * 0.975, priceMax: current * 0.982, strength: "STRONG" },
        { id: "res-1", type: "RESISTANCE", label: "Resistance Zone", priceMin: current * 1.018, priceMax: current * 1.026, strength: "MEDIUM" },
      ],
      annotations: [
        { id: "ann-1", type: "LABEL", label: "Breakout retest", time: candles[candles.length - 18]?.time, price: candles[candles.length - 18]?.close, priority: "HIGH", color: "bullish" },
        { id: "ann-2", type: "MARKER", label: "Volume spike", time: candles[candles.length - 7]?.time, price: candles[candles.length - 7]?.high, priority: "MEDIUM", color: "warning" },
      ],
    },
    tradePlan: {
      direction: verdict === "SHORT" || verdict === "STRONG_SHORT" ? "SHORT" : "LONG",
      entryPrice: current,
      entryZone: { low: current * 0.996, high: current * 1.004 },
      stopLoss: current * 0.978,
      takeProfits: [
        { level: 1, price: current * 1.02, rMultiple: 1.5 },
        { level: 2, price: current * 1.034, rMultiple: 2.2 },
        { level: 3, price: current * 1.05, rMultiple: 3.1 },
      ],
      riskRewardRatio: 2.2,
      trailingStop: { type: "ATR", value: 1.8 },
      notes: "Avoid entry if price closes below support zone on high volume.",
    },
    indicators: [
      { name: "RSI", signal: "Bullish above midline", strength: "MEDIUM", value: 58.2, vote: 1 },
      { name: "MACD", signal: "Positive histogram", strength: "MEDIUM", value: "+0.34", vote: 1 },
      { name: "EMA", signal: "20 > 50", strength: "STRONG", value: "Bull stack", vote: 1 },
      { name: "ADX", signal: "Trend present", strength: "MEDIUM", value: 24, vote: 1 },
      { name: "ATR", signal: "Elevated volatility", strength: "WEAK", value: 1.9, vote: 0 },
    ],
    patterns: [
      { name: "Ascending triangle", status: "CONFIRMED", historicalWinRatePct: 63, sampleSize: 112, avgReturnPct: 4.8, description: "Compression under resistance resolved upward.", timeframe },
      { name: "Volume expansion", status: "TRIGGERED", historicalWinRatePct: 59, sampleSize: 208, avgReturnPct: 3.1, description: "Breakout supported by high relative volume.", timeframe: "1H" },
    ],
    marketContext: {
      trend,
      volatility: "NORMAL",
      sentimentLabel: "Cautious optimism",
      sentimentScore: 62,
      liquidity: "HIGH",
      heatmap: [
        { symbol: market === "CRYPTO" ? "BTC" : market === "US" ? "SPY" : "NIFTY", changePct: 1.2 },
        { symbol: market === "CRYPTO" ? "ETH" : market === "US" ? "QQQ" : "BANKNIFTY", changePct: 0.8 },
        { symbol: market === "CRYPTO" ? "SOL" : market === "US" ? "XLF" : "FINNIFTY", changePct: -0.3 },
      ],
      btcDominance: market === "CRYPTO" ? 55.1 : undefined,
      fundingRate: market === "CRYPTO" ? 0.011 : undefined,
      dxy: market === "US" ? 104.2 : undefined,
      vix: market === "US" ? 17.6 : undefined,
      putCallRatio: market === "US" ? 0.91 : undefined,
    },
    onChain: {
      market,
      exchangeNetflow24hUsd: market === "CRYPTO" ? -38_500_000 : null,
      whaleTxCount24h: market === "CRYPTO" ? 31 : null,
      whaleTxCountChangePct: market === "CRYPTO" ? 18 : undefined,
      mvrv: market === "CRYPTO" ? 1.92 : undefined,
      sopr: market === "CRYPTO" ? 1.03 : undefined,
      lthSupply: market === "CRYPTO" ? 69.4 : undefined,
      institutionalOwnershipPct: market === "US" ? 76.2 : undefined,
      shortInterestPct: market === "US" ? 3.9 : undefined,
      daysToCover: market === "US" ? 1.8 : undefined,
      fiiNetUsd: market === "INDIA" ? -182_000_000 : undefined,
      diiNetUsd: market === "INDIA" ? 165_000_000 : undefined,
      summary: "Flow conditions favor continuation with medium event risk.",
      source: market === "CRYPTO" ? "glassnode" : market === "US" ? "sec-edgar" : "nse",
      updatedAt: now,
    },
    orderFlow: {
      bidAskImbalancePct: 21,
      openInterestUsd: market === "CRYPTO" ? 1_980_000_000 : undefined,
      openInterestChangePct: market === "CRYPTO" ? 3.4 : undefined,
      longShortRatio: 1.17,
      topTraderLongShortRatio: 1.21,
      estLiquidations24hUsd: market === "CRYPTO" ? 126_000_000 : undefined,
      liquidationClusters: [
        { pricePoint: current * 0.98, side: "LONG", usdAmount: 32_000_000 },
        { pricePoint: current * 1.022, side: "SHORT", usdAmount: 41_000_000 },
      ],
    },
    orderBook: {
      bids: Array.from({ length: 10 }, (_, i) => ({
        price: current * (1 - i * 0.0006),
        size: 20 + i * 7,
        cumulative: 20 * (i + 1),
      })),
      asks: Array.from({ length: 10 }, (_, i) => ({
        price: current * (1 + i * 0.0006),
        size: 18 + i * 6,
        cumulative: 18 * (i + 1),
      })),
      spreadBps: 1.9,
      midPrice: current,
      updatedAt: now,
    },
    smartMoney: {
      cvdDivergence: false,
      absorptionAtSupport: true,
      icebergDetectedPrice: current * 1.006,
      icebergSize: 2_800_000,
      spoofingPressure: "ABOVE",
      deltaImbalanceUsd: 9_200_000,
      institutionalFlowSeries: candles.slice(-24).map((candle, index) => ({
        time: candle.time,
        cumulativeUsd: (index - 8) * 1_450_000,
      })),
    },
    events: mockEvents(symbol, market),
    newsAndCatalysts: {
      news: [
        {
          id: `${symbol}-news-1`,
          headline: `${symbol} sees momentum pickup as volume expands above average`,
          source: market === "CRYPTO" ? "CryptoPanic" : market === "US" ? "Benzinga" : "ET Markets",
          url: "https://example.com/news",
          publishedAt: new Date(Date.now() - 42 * 60_000).toISOString(),
          impact: "BULLISH",
          magnitude: "MEDIUM",
          sentimentScore: 0.38,
        },
      ],
      catalysts: [
        {
          id: `${symbol}-cat-1`,
          title: market === "US" ? "Earnings window opens" : market === "CRYPTO" ? "Unlock event" : "FII flow print",
          occursAt: new Date(Date.now() + 2 * 24 * 60 * 60_000).toISOString(),
          impact: "HIGH",
          category: market === "US" ? "EARNINGS" : market === "CRYPTO" ? "TOKEN_EVENT" : "MACRO",
        },
      ],
      aggregateNewsScore: 0.27,
      socialSentimentDeltaPct: 8.4,
    },
    correlation: correlation(market),
    scenarios: {
      horizon: "7d",
      scenarios: [
        { label: "BULL", probabilityPct: 36, targetPrice: current * 1.065, changePct: 6.5, narrative: "Continuation with expansion above resistance." },
        { label: "BASE", probabilityPct: 44, targetPrice: current * 1.018, changePct: 1.8, narrative: "Grinding uptrend with mean reversion dips." },
        { label: "BEAR", probabilityPct: 20, targetPrice: current * 0.954, changePct: -4.6, narrative: "Failed breakout and support loss." },
      ],
      distributionHistogram: Array.from({ length: 11 }, (_, i) => ({
        priceBucket: current * (0.94 + i * 0.012),
        probabilityPct: Math.max(2, 16 - Math.abs(5 - i) * 2),
      })),
    },
    explanation: {
      title: "Why this setup ranks high",
      bullets: [
        "Higher-timeframe trend and structure are aligned with current momentum.",
        "Order-flow imbalance supports continuation and absorbent buy interest is visible.",
        "Recent event flow is supportive while immediate downside catalysts are limited.",
        "Risk/reward remains above minimum threshold with realistic invalidation.",
      ],
      invalidation: "Invalidated on sustained close below support zone with rising sell delta.",
      totalBulletCount: 4,
    },
    riskAnalysis: {
      probabilityOfSuccessPct: 62,
      maxDrawdownPct: 5.4,
      volatilityRisk: "MEDIUM",
      newsRisk: "MEDIUM",
      eventRisk: "HIGH",
      blackSwanProbabilityPct: 4,
      correlationRisk: "MEDIUM",
      recommendedPositionSizeUsd: 1_500,
      accountRiskPct: 1,
      notes: [
        market === "US" ? "Macro CPI print due in 2 days." : market === "CRYPTO" ? "Funding elevated; squeeze risk up." : "FII flows remain net negative this week.",
      ],
    },
    historicalEdge: {
      winRatePct: 58,
      avgRiskReward: 1.84,
      avgDurationMinutes: 420,
      totalSignals: 412,
      sampleSizeLabel: "n=412",
      last20Outcomes: ["WIN", "LOSS", "WIN", "WIN", "BREAKEVEN", "LOSS", "WIN", "WIN", "LOSS", "WIN", "WIN", "LOSS", "WIN", "BREAKEVEN", "WIN", "LOSS", "WIN", "WIN", "LOSS", "WIN"],
      cumulativeReturnPct: 34.8,
      expectancyR: 0.41,
    },
    liveStatus: {
      status: "ACTIVE",
      currentPrice: snapshot?.price ?? current,
      distanceToEntryPct: 0.3,
      nextLevelLabel: "Entry trigger",
      nextLevelPrice: current * 1.004,
      signalGeneratedAt: now,
      updatedAt: now,
      isLive: entitlements.canViewRealtime,
      isStale: !entitlements.canViewRealtime,
      staleReason: entitlements.canViewRealtime ? undefined : "Free tier · 15s delay",
    },
    freshness: {
      price: { status: entitlements.canViewRealtime ? "LIVE" : "DELAYED", lastUpdatedAt: now },
      chart: { status: "LIVE", lastUpdatedAt: now },
      orderFlow: { status: "LIVE", lastUpdatedAt: now },
      orderBook: { status: "LIVE", lastUpdatedAt: now },
      onChain: { status: "DELAYED", lastUpdatedAt: new Date(Date.now() - 5 * 60_000).toISOString() },
      news: { status: "DELAYED", lastUpdatedAt: new Date(Date.now() - 7 * 60_000).toISOString() },
      events: { status: "LIVE", lastUpdatedAt: now },
    },
    entitlements,
    generatedAt: now,
    expiresAt: new Date(Date.now() + 10_000).toISOString(),
  };
}
