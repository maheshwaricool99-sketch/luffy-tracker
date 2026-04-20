import type {
  AppRole,
  ConfidenceBucket,
  FreshnessBadge,
  MarketType,
  SignalDirection,
  SignalStatus,
  SignalType,
  SignalVisibility,
} from "./signalEnums";

export interface LockedFieldMap {
  entry: boolean;
  stopLoss: boolean;
  targets: boolean;
  rationale: boolean;
  aiExplanation: boolean;
  diagnostics: boolean;
  sourceStrategy: boolean;
}

export interface SignalSparkPoint {
  t: string;
  p: number;
}

export interface SignalFreshnessDto {
  ageSeconds: number;
  badge: FreshnessBadge;
  isDelayed: boolean;
}

export interface SignalListItemDto {
  id: string;
  publicId: string;
  symbol: string;
  assetName?: string | null;
  market: MarketType;
  signalType: SignalType;
  direction: SignalDirection;
  timeframe: string;
  status: SignalStatus;
  confidenceScore: number;
  confidenceBucket: ConfidenceBucket;
  currentPrice: number;
  percentChange?: number | null;
  entry?: {
    min: number | null;
    max: number | null;
  };
  stopLoss?: {
    value: number | null;
  };
  targets?: {
    tp1: number | null;
    tp2: number | null;
    tp3: number | null;
  };
  freshness: SignalFreshnessDto;
  rationaleSnippet?: string | null;
  sparkline: SignalSparkPoint[];
  marketBias?: "BULLISH" | "BEARISH" | "NEUTRAL" | null;
  volatilityRegime?: "LOW" | "NORMAL" | "HIGH" | null;
  lockedFields?: LockedFieldMap;
  isWatchlisted?: boolean;
  isPremiumLocked: boolean;
}

export interface SignalTradePlanDto {
  entryMin: number | null;
  entryMax: number | null;
  stopLoss: number | null;
  takeProfit1: number | null;
  takeProfit2: number | null;
  takeProfit3: number | null;
  riskRewardRatio: number | null;
  invalidationCondition?: string | null;
}

export interface SignalLifecycleStepDto {
  key: "DETECTED" | "VALIDATED" | "PUBLISHED" | "TRIGGERED" | "CLOSED" | "EXPIRED" | "INVALIDATED";
  label: string;
  at: string | null;
  state: "DONE" | "CURRENT" | "PENDING";
}

export interface SignalDrawerDto extends SignalListItemDto {
  rationaleFull?: string | null;
  aiExplanationSimple?: string | null;
  aiExplanationQuant?: string | null;
  tradePlan?: SignalTradePlanDto | null;
  technicals?: {
    liquidityScore?: number | null;
    volumeScore?: number | null;
    momentumScore?: number | null;
    structureScore?: number | null;
    derivativesScore?: number | null;
  };
  lifecycle?: SignalLifecycleStepDto[];
  adminDiagnostics?: {
    sourceStrategy?: string | null;
    sourceStrategyVersion?: string | null;
    sourceSignalId?: string | null;
    validationFlags?: Record<string, unknown> | null;
    diagnostics?: Record<string, unknown> | null;
    adminOverride?: boolean;
    adminOverrideReason?: string | null;
  } | null;
}

export interface SignalsPulseDto {
  role: AppRole;
  delayed: boolean;
  activeSignals: number;
  averageConfidence: number;
  todayCounts: {
    total: number;
    crypto: number;
    us: number;
    india: number;
  };
  lastSignal: {
    symbol: string | null;
    market: MarketType | null;
    publishedAt: string | null;
    freshnessBadge: FreshnessBadge | null;
  };
  marketSentiment: {
    bullishPct: number;
    neutralPct: number;
    bearishPct: number;
  };
  winRate30d: {
    value: number | null;
    locked: boolean;
  };
}

export interface AdminSignalListItemDto extends SignalListItemDto {
  visibility: SignalVisibility;
  sourceStrategy: string;
  sourceStrategyVersion?: string | null;
  invalidReason?: string | null;
  moderationState: {
    published: boolean;
    unpublished: boolean;
    invalidated: boolean;
    rejected: boolean;
    adminOverride: boolean;
  };
}

export interface AdminActionRequestDto {
  reason: string;
  force?: boolean;
}

export interface BulkAdminSignalActionDto {
  ids: string[];
  action: "publish" | "unpublish" | "invalidate";
  reason: string;
  force?: boolean;
}
