export type MarketId = "crypto" | "us" | "india";

export type PriceFreshness = "GOOD" | "OK" | "STALE" | "REJECT";

export type PriceSource = "binance" | "okx" | "coingecko" | "yahoo" | "nse" | "bse";
export type PriceSourceType =
  | "primary_ws"
  | "primary_rest"
  | "secondary_ws"
  | "secondary_rest"
  | "cached_fallback";
export type PriceAgeState =
  | "LIVE_OK"
  | "SLIGHTLY_STALE"
  | "DEGRADED"
  | "FALLBACK_ONLY"
  | "INVALID";

export type PriceSnapshot = {
  symbol: string;
  marketId: MarketId;
  price: number;
  bid: number;
  ask: number;
  tsExchange: number;
  tsReceived: number;
  ageMs: number;
  source: PriceSource;
  priceSource: PriceSource;
  stale: boolean;
  freshness: PriceFreshness;
  deliveryState?: "live" | "cached";
  fallback?: string | null;
  sourceType?: PriceSourceType;
  providerName?: string;
  providerTimestamp?: number;
  latencyMs?: number;
  confidenceScore?: number;
  degradeReason?: string | null;
  ageState?: PriceAgeState;
  dataAvailable: boolean;
  error?: string | null;
  currency: "USD" | "USDT" | "INR";
};

export type MarketHealth = {
  marketId: MarketId;
  ok: boolean;
  source: string;
  lastUpdateMs: number;
  staleSymbols: number;
  fallbackActive: boolean;
  details: string;
  symbolCount?: number;
};

export type CatalystRow = {
  symbol: string;
  marketId: MarketId;
  catalystScore: number;
  type: string;
  freshness: PriceFreshness;
  sentiment: number;
  movedPct: number;
  stage: "EARLY" | "DEVELOPING" | "ACTIVE" | "LATE";
  reason: string;
};

export type WhaleFlowRow = {
  symbol: string;
  marketId: "crypto";
  whaleScore: number;
  accumulation: number;
  flowBias: "bullish" | "bearish" | "neutral";
  confidence: number;
  reason: string;
};

export type DerivativesRow = {
  symbol: string;
  marketId: "crypto";
  funding: number;
  openInterest: number;
  derivativesScore: number;
  stage: "EARLY" | "DEVELOPING" | "ACTIVE" | "LATE";
  reason: string;
};

export type LiquidationRow = {
  symbol: string;
  marketId: "crypto";
  longLiquidationZone: number;
  shortLiquidationZone: number;
  heatScore: number;
  reason: string;
};

export type PredictionSignal = {
  symbol: string;
  marketId: MarketId;
  companyName?: string;
  price: number;
  signalScore: number;
  stage: "EARLY" | "DEVELOPING" | "ACTIVE" | "LATE";
  accumulation: number;
  structure: number;
  volumeAnomaly: number;
  whale: number;
  derivatives: number;
  catalyst: number;
  riskPenalty: number;
  breakoutProbability: number;
  relativeStrength?: number;
  freshness: PriceFreshness;
  movedPct: number;
  reason: string;
  priceSource: string;
};

export type MarketSymbolInfo = {
  symbol: string;
  marketId: MarketId;
  name: string;
  currency: "USD" | "USDT" | "INR";
  benchmark?: string;
};
