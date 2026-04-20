import type { MarketId, PriceFreshness, PriceSnapshot } from "@/lib/market-data/shared/types";
import type { CandlePoint } from "@/lib/market-data/shared/candle-service";
import type { MarketScannerSnapshot, ProviderRuntime, ScannerDataState, SkipReason, WarmupPhase } from "@/lib/scanner/types";
import type { RuntimeFlags } from "@/lib/runtime/runtime-types";

export type SourceModel =
  | "continuation_model"
  | "breakout_model"
  | "reversal_model"
  | "high_confidence_filter"
  | "early_detection_filter";

export type SignalDirection = "long" | "short" | "none";
export type SignalClass = "elite" | "strong" | "watchlist";
export type DataQuality = "healthy" | "stale" | "misaligned";
export type LifecycleState =
  | "detected"
  | "validated"
  | "published"
  | "triggered"
  | "open"
  | "closed_tp"
  | "closed_sl"
  | "closed_timeout"
  | "invalidated_before_entry";

export type ModelOutput = {
  symbol: string;
  market: MarketId;
  direction: SignalDirection;
  strength: number;
  confidence: number;
  timestamp: number;
  features: {
    structure?: number;
    momentum?: number;
    volume?: number;
    volatility?: number;
    trend?: number;
    derivatives?: number;
  };
  meta?: {
    sourceModel: SourceModel;
    latencyMs?: number;
    candleTimeframe?: string;
    dataQuality?: DataQuality;
  };
};

export type SignalFeatureContext = {
  symbol: string;
  market: MarketId;
  priceSnapshot: PriceSnapshot;
  candles: CandlePoint[];
  candleAgeMs: number;
  structure: {
    score: number;
    compressionPct: number;
    equalZoneHits: number;
    movePct: number;
    trendShift: number;
  };
  momentumScore: number;
  volume: {
    ratio: number;
    anomalyScore: number;
    recentAvg: number;
    baselineAvg: number;
  };
  catalystScore: number;
  whaleScore: number;
  derivativesScore: number;
  regime: {
    trend: "bullish" | "bearish" | "neutral";
    volatility: "low" | "normal" | "high";
    liquidity: "healthy" | "weak";
  };
  expectedR: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  rationaleInputs: string[];
  invalidatesOn: string[];
};

export type AggregatedSignalCandidate = {
  symbol: string;
  market: MarketId;
  direction: "long" | "short";
  finalScore: number;
  confidence: number;
  timestamp: number;
  contributors: {
    continuation_model?: number;
    breakout_model?: number;
    reversal_model?: number;
    high_confidence_filter?: number;
    early_detection_filter?: number;
  };
  scoreBreakdown: {
    structure: number;
    momentum: number;
    volume: number;
    volatility: number;
    trend: number;
    derivatives: number;
    rr: number;
    disagreementPenalty: number;
  };
  rationaleInputs: string[];
  validationFlags: string[];
  expectedR: number;
  dataQuality: DataQuality;
};

export type PublishedSignal = {
  id: string;
  symbol: string;
  market: MarketId;
  direction: "long" | "short";
  confidence: number;
  class: SignalClass;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  expectedR: number;
  timestamp: number;
  regime: {
    trend: "bullish" | "bearish" | "neutral";
    volatility: "low" | "normal" | "high";
    liquidity: "healthy" | "weak";
  };
  scoreBreakdown: {
    structure: number;
    momentum: number;
    volume: number;
    volatility: number;
    trend: number;
    derivatives: number;
    rr: number;
  };
  rationale: string[];
  invalidatesOn: string[];
  contributors: {
    advanced?: number;
    expert?: number;
    ace?: number;
    luffy?: number;
    lite?: number;
  };
  dataQuality: DataQuality;
  sourceMeta: {
    primarySource: string;
    fallbackSource?: string;
    priceAgeMs: number;
    candleAgeMs: number;
    dataState: ScannerDataState;
    restoredFromSnapshot?: boolean;
    sourceType?: string;
    confidenceScore?: number;
    degradeReason?: string | null;
  };
  lifecycleState: LifecycleState;
};

export type BlockedSignalReasonCode =
  | "BLOCKED_STALE_SCANNER"
  | "BLOCKED_DEGRADED_INPUT"
  | "BLOCKED_FALLBACK_PRICE_ONLY"
  | "BLOCKED_PRICE_TOO_OLD"
  | "BLOCKED_LOW_COVERAGE"
  | "BLOCKED_PROVIDER_UNHEALTHY"
  | "BLOCKED_CROSS_MARKET_CONFIRMATION_MISSING";

export type BlockedSignalRecord = {
  signalId: string;
  symbol: string;
  market: MarketId;
  strategy: string;
  blockedAt: number;
  reasonCode: BlockedSignalReasonCode;
  reasonText: string;
  primaryProvider: string;
  fallbackProvider: string | null;
  inputAgeMs: number | null;
  scannerAgeMs: number | null;
  affectedDependencies: string[];
  canAutoRecover: boolean;
  nextRetryAt: number | null;
  scope: "symbol" | "market";
  active: boolean;
};

export type PublishCheck = {
  ok: boolean;
  reason?: string;
  flags: string[];
  degraded: boolean;
};

export type ScannerCoverage = {
  market: MarketId;
  totalSymbols: number;
  scannedSymbols: number;
  skippedSymbols: number;
  lastScanTime: number;
  scanDurationMs: number;
  coveragePct: number;
  degraded: boolean;
  skippedReasons: Record<string, number>;
};

export type HealthSnapshot = {
  degraded: boolean;
  degradedReasons: string[];
  snapshotRestoreActive: boolean;
  engine: {
    status: "warming" | "ready" | "restored";
    inFlight: boolean;
    lastRun: number;
    publishedCount: number;
    restoredSignals: number;
  };
  sourceHealth: Array<{
    market: MarketId;
    open: boolean;
    freshness: PriceFreshness | "UNAVAILABLE";
    lastSyncTs: number;
    fallbackActive: boolean;
    primarySource: string;
    dataState: ScannerDataState;
    providerStatus: ProviderRuntime["status"];
    providerBackoffActive: boolean;
    providerCooldownUntil: number | null;
    coveragePct: number;
    warmupPhase: WarmupPhase;
    liveCount: number;
    cachedCount: number;
    restoredCount: number;
    staleCount: number;
  }>;
  scanner: MarketScannerSnapshot[];
  providers: ProviderRuntime[];
  modelLatency: Record<SourceModel, { avgMs: number; invalidCount: number; outputCount: number }>;
  validationFailures: Record<string, number>;
  fallbackUsage: Record<string, number>;
  skipReasons: Partial<Record<SkipReason, number>>;
  blockedSignals?: BlockedSignalRecord[];
  runtimeFlags?: RuntimeFlags;
  runtimeVersion?: number;
};

export type SignalRunResult = {
  published: PublishedSignal[];
  rejected: Array<{ symbol: string; market: MarketId; reason: string }>;
  health: HealthSnapshot;
};
