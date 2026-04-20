import type { MarketType, SignalDirection, SignalType } from "@/lib/signals/types/signalEnums";

export type IntegrityStatus =
  | "VERIFIED"
  | "LIVE"
  | "DELAYED"
  | "PARTIAL"
  | "DEGRADED"
  | "MISMATCHED"
  | "UNTRUSTED"
  | "SCANNER_ONLY"
  | "REVIEW_REQUIRED";

export type SignalActionability =
  | "READY_NOW"
  | "WAIT_FOR_TRIGGER"
  | "WATCH_RETEST"
  | "TOO_EXTENDED"
  | "INFORMATIONAL_ONLY";

export type QualityGrade = "ELITE" | "STRONG" | "GOOD" | "WATCH_ONLY" | "SPECULATIVE" | "AVOID";

export type MarketRegime =
  | "BULLISH"
  | "BEARISH"
  | "NEUTRAL"
  | "TRANSITION_BULLISH"
  | "TRANSITION_BEARISH"
  | "EXPANSION"
  | "COMPRESSION";

export type VolatilityRegime = "LOW" | "NORMAL" | "HIGH";

export type RiskGrade = "LOW" | "MEDIUM" | "HIGH" | "SPECULATIVE";

export type IntelligenceSignalStatus =
  | "ACTIVE"
  | "EARLY"
  | "READY"
  | "TRIGGERED"
  | "EXTENDED"
  | "WATCHLIST"
  | "EXPIRED"
  | "STALE"
  | "BLOCKED"
  | "REVIEW";

export type ReasoningTag =
  | "Structure"
  | "Volume"
  | "Trend"
  | "Flow"
  | "Momentum"
  | "Regime"
  | "Relative Strength"
  | "Pattern"
  | "Catalyst"
  | "Derivatives"
  | "Liquidity"
  | "Confirmation";

export interface ReasoningBullet {
  tag: ReasoningTag;
  text: string;
  positive: boolean;
}

export interface StrategyContribution {
  strategyName: string;
  rawScore: number;
  weightedScore: number;
  directionBias: SignalDirection | "NEUTRAL";
  confidenceContribution: number;
  conflictPenalty: number;
  adminWeightApplied: boolean;
  enabledAtPublish: boolean;
}

export interface IntelligenceTradePlan {
  entryMin: number | null;
  entryMax: number | null;
  triggerCondition: string | null;
  stopLoss: number | null;
  tp1: number | null;
  tp2: number | null;
  tp3: number | null;
  riskReward: number | null;
  timeframe: string;
  tradeStyle: string;
  estimatedHold: string | null;
  riskGrade: RiskGrade;
  invalidationRule: string | null;
  entryQualityScore: number | null;
  stopPlacementQuality: number | null;
  targetRealismScore: number | null;
  entryStillValid: boolean;
  isExtended: boolean;
  locked: boolean;
}

export interface IntelligenceMarketContext {
  market: MarketType;
  regime: MarketRegime;
  volatilityRegime: VolatilityRegime;
  htfBias: "BULLISH" | "BEARISH" | "MIXED";
  relativeStrength: "STRONG" | "NEUTRAL" | "WEAK" | null;
  sector: string | null;
  correlationPressure: string | null;
}

export interface IntelligenceFeedMeta {
  dataSource: string;
  feedType: string;
  freshnessMs: number;
  integrityStatus: IntegrityStatus;
  priceAligned: boolean;
  volumeAligned: boolean;
  adminReviewed: boolean;
  scanFreshness: string;
}

export interface IntelligenceSignal {
  id: string;
  symbol: string;
  assetName: string | null;
  market: MarketType;
  direction: SignalDirection;
  setupType: SignalType;
  status: IntelligenceSignalStatus;
  timeframe: string;

  currentPrice: number;
  percentChange: number | null;

  confidence: number;
  finalRankScore: number;
  actionability: SignalActionability;
  qualityGrade: QualityGrade;

  generatedAt: string;
  confirmedAt: string | null;
  expiresAt: string | null;

  marketContext: IntelligenceMarketContext;
  tradePlan: IntelligenceTradePlan;

  reasoningBullets: ReasoningBullet[];
  strategyContributions: StrategyContribution[];
  conflictFlags: string[];

  feedMeta: IntelligenceFeedMeta;

  premiumOnly: boolean;
  freeVisible: boolean;
  delayedForFree: boolean;
  teaserText: string | null;
  adminAdjusted: boolean;
  adminPriority: boolean;
  adminReviewed: boolean;

  isPremiumLocked: boolean;
  isStrategyLocked: boolean;

  sparkline: { t: string; p: number }[];
  historySimilarityStats: { reachedTp1Pct: number; sampleSize: number } | null;
}

export interface IntelligenceMarketPulse {
  market: MarketType;
  status: string;
  signalCount: number;
  avgConfidence: number;
  integrityStatus: IntegrityStatus;
  freshnessMs: number;
}

export interface IntelligencePageStats {
  totalLive: number;
  premiumCount: number;
  marketsActive: string[];
  lastRefreshAt: string;
  feedHealthPct: number;
}

export interface IntelligencePagePayload {
  signals: IntelligenceSignal[];
  marketPulse: IntelligenceMarketPulse[];
  stats: IntelligencePageStats;
  role: "GUEST" | "FREE" | "PREMIUM" | "ADMIN" | "SUPERADMIN";
  isPremium: boolean;
  isAdmin: boolean;
}

export interface IntelligenceFilters {
  market?: MarketType | "ALL";
  direction?: SignalDirection | "ALL";
  timeframe?: string;
  confidenceMin?: number;
  scoreMin?: number;
  rrMin?: number;
  freshness?: "LIVE" | "ANY";
  integrityMin?: IntegrityStatus;
  strategyFamily?: string;
  sector?: string;
  status?: IntelligenceSignalStatus | "ALL";
  query?: string;
  onlyPremiumGrade?: boolean;
  onlyLive?: boolean;
  onlyAdminReviewed?: boolean;
  onlyMultiStrategy?: boolean;
  onlyActionReady?: boolean;
  sortBy?:
    | "score"
    | "confidence"
    | "freshness"
    | "rr"
    | "strategies"
    | "actionability"
    | "trend"
    | "adminPriority"
    | "recent";
}
