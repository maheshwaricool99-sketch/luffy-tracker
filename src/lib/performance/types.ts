export type PerformanceRole = "GUEST" | "FREE" | "PREMIUM" | "ADMIN";

export type PerformanceMarket = "CRYPTO" | "US" | "INDIA";
export type PerformanceClass = "ELITE" | "STRONG" | "WATCHLIST";
export type PerformanceDirection = "LONG" | "SHORT";
export type PerformanceOutcome = "TP" | "SL" | "TIMEOUT";
export type PerformanceSource = "LIVE" | "SNAPSHOT" | "DELAYED";
export type PerformanceSourceMeta = PerformanceSource | "MIXED";
export type PerformanceDataState = "LIVE" | "PARTIAL" | "DELAYED" | "EMPTY" | "ERROR";
export type PerformanceRange = "7d" | "30d" | "90d" | "all";
export type PerformanceConfidenceBucketKey = "90plus" | "80to89" | "70to79" | "lt70" | "all";

export type PerformanceFilters = {
  market: "all" | "crypto" | "us" | "india";
  class: "all" | "elite" | "strong" | "watchlist";
  confidenceBucket: PerformanceConfidenceBucketKey;
  range: PerformanceRange;
  source: "all" | "live" | "snapshot" | "delayed";
  page: number;
  pageSize: number;
  includeAdmin: boolean;
  refresh: boolean;
};

export type PerformanceSummary = {
  winRate: number | null;
  winRateChange7d: number | null;
  expectancy: number | null;
  avgR: number | null;
  closedTrades: number;
  activeTrades: number;
  bestStreak: number | null;
  worstDrawdownR: number | null;
};

export type PerformanceTradeDto = {
  id: string;
  signalId?: string;
  symbol: string;
  market: PerformanceMarket;
  direction: PerformanceDirection;
  entry: number;
  exit: number;
  resultPct: number;
  r: number;
  confidence: number;
  timeHeldMs: number;
  outcome: PerformanceOutcome;
  source: PerformanceSource;
  closedAt: number;
  openedAt: number;
  signalClass?: PerformanceClass;
  sourceLabel?: string;
  updatedAt?: number;
  ingestionAt?: number;
};

export type PerformanceBreakdownRow<T extends string> = {
  [K in "market" | "bucket" | "class"]?: T;
} & {
  closedTrades: number;
  winRate: number | null;
  expectancy: number | null;
};

export type PerformanceApiResponse = {
  summary: PerformanceSummary;
  equityCurve: Array<{
    time: number;
    value: number;
  }>;
  breakdown: {
    byMarket: Array<{
      market: PerformanceMarket;
      closedTrades: number;
      winRate: number | null;
      expectancy: number | null;
    }>;
    byConfidence: Array<{
      bucket: "90+" | "80-89" | "70-79" | "<70";
      closedTrades: number;
      winRate: number | null;
      expectancy: number | null;
    }>;
    byClass: Array<{
      class: PerformanceClass;
      closedTrades: number;
      winRate: number | null;
      expectancy: number | null;
    }>;
  };
  trades: PerformanceTradeDto[];
  meta: {
    role: PerformanceRole;
    source: PerformanceSourceMeta;
    lastUpdated: number | null;
    delayedByMs: number | null;
    dataState: PerformanceDataState;
    cache: {
      hit: boolean;
      key: string | null;
      generatedAt: number;
      ttlSec: number;
    };
    filters: Omit<PerformanceFilters, "includeAdmin" | "refresh">;
    totalTrades: number;
    totalPages: number;
    canUseFilters: boolean;
    locked: {
      metrics: boolean;
      equityCurve: boolean;
      byConfidence: boolean;
      byClass: boolean;
      expectancy: boolean;
      advancedFilters: boolean;
      export: boolean;
    };
    statusLabel: "Live Engine" | "Synced Snapshot" | "Delayed Feed" | "Mixed Sources" | "No Data";
  };
  admin?: {
    excludedTradeCount: number;
    exclusionReasons: Record<string, number>;
    rawSourceBreakdown: Array<{
      source: string;
      count: number;
    }>;
    provenance: {
      sourceTable: string;
      closedAtField: string;
      openedAtField: string;
      exitComputation: string;
    };
  };
};

export type PerformanceRecord = {
  id: string;
  signalId?: string;
  symbol: string;
  market: PerformanceMarket;
  direction: PerformanceDirection;
  signalClass: PerformanceClass;
  confidence: number;
  entry: number;
  stop: number;
  target: number;
  expectedR: number;
  source: PerformanceSource;
  sourceRaw: string;
  sourceLabel: "Live Engine" | "Synced Snapshot" | "Delayed Feed";
  openedAt: number;
  closedAt: number;
  updatedAt: number;
  ingestionAt: number;
  outcome: PerformanceOutcome;
  r: number;
  exit: number;
  resultPct: number;
  timeHeldMs: number;
};

export type PerformanceExclusion = {
  id: string;
  reason: string;
  sourceRaw: string;
};
