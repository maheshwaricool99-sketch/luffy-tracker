export type Market = "CRYPTO" | "US" | "INDIA";
export type Timeframe = "5m" | "15m" | "1H" | "4H" | "1D" | "1W";

export type Verdict = "STRONG_LONG" | "LONG" | "NEUTRAL" | "SHORT" | "STRONG_SHORT";
export type TimeHorizon = "SCALP" | "INTRADAY" | "SWING" | "POSITION";
export type Strength = "WEAK" | "MEDIUM" | "STRONG";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type Trend = "BULLISH" | "BEARISH" | "NEUTRAL";
export type SignalStatus = "WATCHING" | "TRIGGERED" | "ACTIVE" | "CLOSED" | "INVALIDATED";

export interface ConfidenceBreakdown {
  trend: number;
  volume: number;
  structure: number;
  indicators: number;
  marketContext: number;
  onChainFlow: number;
}

export interface DecisionEngine {
  verdict: Verdict;
  confidencePct: number;
  finalScore: number;
  riskGrade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D";
  timeHorizon: TimeHorizon;
  summary: string;
  confidenceBreakdown: ConfidenceBreakdown;
  generatedAt: string;
}

export interface ChartCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface ChartLinePoint {
  time: number;
  value: number;
}

export interface ChartZone {
  id: string;
  type: "RESISTANCE" | "SUPPORT" | "LIQUIDITY" | "VALUE_AREA";
  label: string;
  priceMin: number;
  priceMax: number;
  strength: Strength;
}

export interface ChartAnnotation {
  id: string;
  type: "LABEL" | "ARROW" | "LINE" | "MARKER";
  label?: string;
  time?: number;
  price?: number;
  points?: Array<{ time: number; price: number }>;
  color?: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export interface AnalysisChartData {
  candles: ChartCandle[];
  ema20?: ChartLinePoint[];
  ema50?: ChartLinePoint[];
  ema200?: ChartLinePoint[];
  vwap?: ChartLinePoint[];
  zones: ChartZone[];
  annotations: ChartAnnotation[];
  currentPrice: number | null;
}

export type MtfMetric = "trend" | "momentum" | "structure" | "volume" | "orderFlow";

export interface MtfCell {
  timeframe: Timeframe;
  signal: Trend;
  label: string;
  strength: Strength;
  value?: number;
}

export interface MtfRow {
  metric: MtfMetric;
  cells: MtfCell[];
}

export interface MtfConfluence {
  rows: MtfRow[];
  alignedCount: number;
  totalCells: number;
  aggregateVerdict: Verdict;
}

export interface TradePlan {
  direction: "LONG" | "SHORT";
  entryPrice: number | null;
  entryZone?: { low: number; high: number };
  stopLoss: number | null;
  takeProfits: Array<{ level: 1 | 2 | 3; price: number; rMultiple: number }>;
  riskRewardRatio: number | null;
  trailingStop?: { type: "ATR" | "PCT"; value: number };
  notes?: string;
}

export interface IndicatorSignal {
  name: "RSI" | "MACD" | "VOLUME" | "ADX" | "EMA" | "BOLLINGER" | "STOCHASTIC" | "ICHIMOKU" | "VWAP" | "ATR";
  signal: string;
  strength: Strength;
  value?: number | string;
  vote: -1 | 0 | 1;
}

export interface PatternMatch {
  name: string;
  status: "CONFIRMED" | "TRIGGERED" | "FORMING" | "INVALIDATED";
  historicalWinRatePct?: number;
  sampleSize?: number;
  avgReturnPct?: number;
  description: string;
  timeframe: Timeframe;
}

export interface MarketHeatmapItem {
  symbol: string;
  changePct: number;
  marketCap?: number;
}

export interface MarketContext {
  trend: Trend;
  volatility: "LOW" | "NORMAL" | "HIGH";
  volatilityIndex?: number;
  sentimentLabel: string;
  sentimentScore?: number;
  liquidity: "LOW" | "NORMAL" | "HIGH";
  heatmap?: MarketHeatmapItem[];
  btcDominance?: number;
  fundingRate?: number;
  dxy?: number;
  vix?: number;
  putCallRatio?: number;
}

export interface OnChainMetrics {
  market: Market;
  exchangeNetflow24hUsd: number | null;
  whaleTxCount24h: number | null;
  whaleTxCountChangePct?: number;
  mvrv?: number | null;
  sopr?: number | null;
  lthSupply?: number | null;
  minerReservesBtc?: number | null;
  activeAddresses7d?: number | null;
  institutionalOwnershipPct?: number | null;
  shortInterestPct?: number | null;
  daysToCover?: number | null;
  fiiNetUsd?: number | null;
  diiNetUsd?: number | null;
  summary?: string;
  source: string;
  updatedAt: string;
}

export interface LiquidationCluster {
  pricePoint: number;
  side: "LONG" | "SHORT";
  usdAmount: number;
}

export interface OrderFlowMetrics {
  bidAskImbalancePct: number;
  openInterestUsd?: number;
  openInterestChangePct?: number;
  longShortRatio?: number;
  topTraderLongShortRatio?: number;
  estLiquidations24hUsd?: number;
  liquidationClusters: LiquidationCluster[];
}

export interface OrderBookLevel {
  price: number;
  size: number;
  cumulative: number;
}

export interface OrderBookSnapshot {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spreadBps: number;
  midPrice: number;
  updatedAt: string;
}

export interface SmartMoneyFootprint {
  cvdDivergence: boolean;
  absorptionAtSupport: boolean;
  icebergDetectedPrice?: number | null;
  icebergSize?: number | null;
  spoofingPressure: "NONE" | "ABOVE" | "BELOW";
  deltaImbalanceUsd: number;
  institutionalFlowSeries: Array<{ time: number; cumulativeUsd: number }>;
}

export type EventAlertKind =
  | "SUPPLY_UNLOCK"
  | "WHALE_DEPOSIT"
  | "WHALE_WITHDRAWAL"
  | "VOLUME_ANOMALY"
  | "INSIDER_TRADE"
  | "ETF_FLOW"
  | "EARNINGS"
  | "LIQUIDATION_CLUSTER"
  | "LARGE_BLOCK_TRADE"
  | "UNUSUAL_OPTIONS"
  | "GOVERNANCE_VOTE"
  | "FII_DII_FLOW"
  | "BULK_DEAL"
  | "BLOCK_DEAL";

export type EventSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type EventImpact = "BULLISH" | "BEARISH" | "NEUTRAL";

export interface EventAlert {
  id: string;
  kind: EventAlertKind;
  severity: EventSeverity;
  symbol: string;
  title: string;
  description: string;
  impact: EventImpact;
  occurredAt?: string;
  scheduledFor?: string;
  valueUsd?: number;
  metadata: Record<string, unknown>;
  source: string;
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  url: string;
  publishedAt: string;
  impact: EventImpact;
  magnitude: "HIGH" | "MEDIUM" | "LOW";
  sentimentScore: number;
}

export interface CatalystEvent {
  id: string;
  title: string;
  occursAt: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  category: "MACRO" | "EARNINGS" | "REGULATORY" | "TOKEN_EVENT" | "CORPORATE";
}

export interface NewsAndCatalysts {
  news: NewsItem[];
  catalysts: CatalystEvent[];
  aggregateNewsScore: number;
  socialSentimentDeltaPct: number;
}

export interface CorrelationPair {
  symbol: string;
  correlation: number;
  period: "7d" | "30d" | "90d";
}

export interface MarketRegime {
  label: string;
  confidencePct: number;
  description: string;
}

export interface CorrelationMatrix {
  pairs: CorrelationPair[];
  regime: MarketRegime;
}

export interface Scenario {
  label: "BULL" | "BASE" | "BEAR";
  probabilityPct: number;
  targetPrice: number;
  changePct: number;
  narrative: string;
}

export interface ScenarioOutcomes {
  horizon: "24h" | "7d" | "30d";
  scenarios: Scenario[];
  distributionHistogram: Array<{ priceBucket: number; probabilityPct: number }>;
}

export interface AiExplanation {
  title: string;
  bullets: string[];
  invalidation: string;
  totalBulletCount: number;
}

export interface RiskAnalysis {
  probabilityOfSuccessPct: number | null;
  maxDrawdownPct: number | null;
  volatilityRisk: RiskLevel;
  newsRisk: RiskLevel;
  eventRisk: RiskLevel;
  blackSwanProbabilityPct?: number;
  correlationRisk: RiskLevel;
  recommendedPositionSizeUsd?: number | null;
  accountRiskPct?: number | null;
  notes: string[];
}

export interface HistoricalEdge {
  winRatePct: number | null;
  avgRiskReward: number | null;
  avgDurationMinutes: number | null;
  totalSignals: number | null;
  sampleSizeLabel: string;
  last20Outcomes: Array<"WIN" | "LOSS" | "BREAKEVEN">;
  cumulativeReturnPct: number;
  expectancyR: number;
}

export interface LiveStatus {
  status: SignalStatus;
  currentPrice: number | null;
  distanceToEntryPct: number | null;
  nextLevelLabel?: string;
  nextLevelPrice?: number | null;
  signalGeneratedAt: string | null;
  updatedAt: string | null;
  isLive: boolean;
  isStale: boolean;
  staleReason?: string;
}

export type FeedStatus = "LIVE" | "DELAYED" | "STALE";

export interface FeedState {
  status: FeedStatus;
  lastUpdatedAt: string;
}

export interface DataFreshness {
  price: FeedState;
  chart: FeedState;
  orderFlow: FeedState;
  orderBook: FeedState;
  onChain: FeedState;
  news: FeedState;
  events: FeedState;
}

export interface AnalysisEntitlements {
  canViewFullTradePlan: boolean;
  canViewAdvancedReasoning: boolean;
  canViewRealtime: boolean;
  canViewHistoricalEdge: boolean;
  canViewOnChain: boolean;
  canViewOrderFlow: boolean;
  canViewOrderBook: boolean;
  canViewSmartMoney: boolean;
  canViewScenarios: boolean;
  canViewMtfConfluence: boolean;
  canViewEventAlerts: boolean;
  canViewDeepEvents: boolean;
  canCreateAlerts: boolean;
  maxAlertsCount: number;
  canExportData: boolean;
}

export interface AiAnalysisResponse {
  symbol: string;
  market: Market;
  timeframe: Timeframe;
  exchange: string;
  assetName: string;
  decisionEngine: DecisionEngine;
  mtfConfluence: MtfConfluence;
  chart: AnalysisChartData;
  tradePlan: TradePlan;
  indicators: IndicatorSignal[];
  patterns: PatternMatch[];
  marketContext: MarketContext;
  onChain: OnChainMetrics | null;
  orderFlow: OrderFlowMetrics | null;
  orderBook: OrderBookSnapshot | null;
  smartMoney: SmartMoneyFootprint | null;
  events: EventAlert[];
  newsAndCatalysts: NewsAndCatalysts | null;
  correlation: CorrelationMatrix | null;
  scenarios: ScenarioOutcomes | null;
  explanation: AiExplanation;
  riskAnalysis: RiskAnalysis;
  historicalEdge: HistoricalEdge | null;
  liveStatus: LiveStatus;
  freshness: DataFreshness;
  entitlements: AnalysisEntitlements;
  generatedAt: string;
  expiresAt: string;
}

export interface ApiError {
  error: string;
  code: "INVALID_SYMBOL" | "INVALID_TIMEFRAME" | "UNSUPPORTED_MARKET" | "UPSTREAM_UNAVAILABLE" | "RATE_LIMITED" | "INTERNAL";
  details?: Record<string, unknown>;
}
