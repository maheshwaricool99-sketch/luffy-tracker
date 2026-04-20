export type HealthStatus = "operational" | "degraded" | "partial_outage" | "down";
export type MarketStatus = "live" | "snapshot" | "degraded" | "blocked";
export type DataState = "live" | "snapshot" | "stale";
export type SignalsState = "fresh" | "delayed" | "blocked";
export type ExecutionState = "enabled" | "disabled";
export type ComponentStatus = "healthy" | "degraded" | "reconnecting" | "paused" | "disabled" | "down";
export type ProviderHealthStatus = "healthy" | "active" | "fallback" | "delayed" | "reconnecting" | "rate_limited" | "down";
export type ReliabilityLabel = "high_confidence" | "use_caution" | "not_reliable";
export type IncidentSeverity = "info" | "warning" | "critical";
export type IncidentStatus = "active" | "monitoring" | "resolved";
export type SignalQuality = "high" | "medium" | "low";
export type ScannerMode = "warmup" | "steady" | "backoff" | "degraded" | "blocked";
export type TrustPosture = "TRUSTED" | "CAUTION" | "DEGRADED" | "UNRELIABLE";
export type IncidentCategory =
  | "data_freshness"
  | "provider_outage"
  | "fallback_usage"
  | "stale_scanner"
  | "low_market_coverage"
  | "signal_blocking"
  | "symbol_mapping"
  | "latency_spike";
export type IncidentSeverityV2 = "INFO" | "WARNING" | "MAJOR" | "CRITICAL";
export type IncidentStatusV2 = "ACTIVE" | "MITIGATED" | "RECOVERING" | "RESOLVED";

export type HealthSummary = {
  title: string;
  message: string;
  dataState: DataState;
  signalsState: SignalsState;
  executionState: ExecutionState;
  coverageText: string;
  bootstrapping: boolean;
  recovering: boolean;
};

export type HealthTimestamps = {
  now: number;
  lastSystemUpdate: number | null;
  lastScan: number | null;
  lastSignal: number | null;
  lastIncidentChange: number | null;
  lastRecoveryAttempt: number | null;
};

export type HealthBanner = {
  severity: IncidentSeverity;
  title: string;
  whatHappened: string[];
  impact: string[];
  recovery: string[];
};

export type ProviderHealthItem = {
  name: string;
  status: ProviderHealthStatus;
  latencyMs: number | null;
  lastSuccessMs: number | null;
  note?: string;
  successRate?: number | null;
  errorRate?: number | null;
  reconnectCount?: number | null;
  symbolCoverage?: number | null;
};

export type SnapshotInfo = {
  active: boolean;
  ageMs: number | null;
  reason: string | null;
  safeFor: string[];
  impact: string[];
};

export type MarketHealthCard = {
  key: "crypto" | "us" | "india";
  label: string;
  status: MarketStatus;
  whatItMeans: string;
  metrics: {
    dataSource: string;
    signalQuality: SignalQuality;
    latencyMs: number | null;
    coverage: number;
    totalPairs: number;
  };
  signalStats: {
    generated1h: number;
    valid1h: number;
    filtered1h: number;
    freshnessState: "live" | "delayed" | "stale";
    freshnessAgeMs: number | null;
  };
  scanner: {
    mode: ScannerMode;
    freshnessState?: "LIVE" | "SLOW" | "STALE" | "DEGRADED" | "RECOVERING" | "HALTED";
    scanned: number;
    total: number;
    skipped: number;
    completionPct: number;
    lastCycleDurationMs: number | null;
    reasons: Array<{ code: string; label: string; count: number }>;
  };
  providers: ProviderHealthItem[];
  snapshot: SnapshotInfo;
  timestamps: {
    lastUpdated: number | null;
    lastSnapshot: number | null;
    lastSuccessfulScan: number | null;
  };
};

export type ReliabilityBreakdown = {
  freshness: number;
  dataIntegrity: number;
  coverage: number;
  executionReadiness: number;
  macroStability: number;
  providerQuality: number;
};

export type ReliabilityInfo = {
  score: number;
  label: ReliabilityLabel;
  explanation: string;
  breakdown: ReliabilityBreakdown;
  trustPosture?: TrustPosture;
  metrics?: {
    livePriceCoveragePct: number;
    fallbackUsagePct: number;
    scannerFreshnessPct: number;
    signalEligibilityPct: number;
    providerHealthPct: number;
    marketCoveragePct: number;
    symbolFreshnessPct: number;
    crossCheckConsistencyPct: number;
    incidentPenalty: number;
  };
};

export type ComponentHealth = {
  key: string;
  label: string;
  status: ComponentStatus;
  latencyMs: number | null;
  errorRatePct: number | null;
  lastHeartbeatMs: number | null;
  note?: string;
};

export type Incident = {
  id: string;
  ts: number;
  severity: IncidentSeverity;
  title: string;
  summary: string;
  impact: string;
  status: IncidentStatus;
  category?: IncidentCategory;
  severityV2?: IncidentSeverityV2;
  statusV2?: IncidentStatusV2;
  affectedMarkets?: Array<"crypto" | "us" | "india">;
  affectedSymbolsCount?: number;
  firstDetectedAt?: number;
  lastUpdatedAt?: number;
  cause?: string;
  userImpact?: string;
  mitigation?: string;
  confidenceImpact?: number;
  resolutionEtaMs?: number | null;
  weight?: number;
};

export type TradeBlocker = {
  code: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
};

export type TradeBlockerSummary = {
  activeTradeSlots: number;
  maxTradeSlots: number;
  remainingSlots: number;
  openPositions: number;
  replacementState?: string;
  blockers: TradeBlocker[];
};

export type TrustIssue = {
  key: "fallback_price_usage" | "blocked_signals" | "active_reliability_incidents";
  title: string;
  severity: "info" | "warning" | "danger";
  status: string;
  summary: string;
  details: string[];
};

export type FallbackMarketExposure = {
  market: "crypto" | "us" | "india";
  livePriceCoveragePct: number;
  fallbackUsagePct: number;
  affectedSymbols: number;
  affectedProviders: string[];
  status: "healthy" | "recovering" | "degraded" | "blocked";
};

export type BlockedSignalView = {
  signalId: string;
  symbol: string;
  market: "crypto" | "us" | "india";
  strategy: string;
  blockedAt: number;
  reasonCode: string;
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

export type HealthResponse = {
  status: HealthStatus;
  summary: HealthSummary;
  timestamps: HealthTimestamps;
  banner?: HealthBanner;
  markets: {
    crypto: MarketHealthCard;
    us: MarketHealthCard;
    india: MarketHealthCard;
  };
  reliability: ReliabilityInfo;
  components: ComponentHealth[];
  blockers: TradeBlockerSummary;
  incidents: Incident[];
  trust: {
    posture: TrustPosture;
    issues: TrustIssue[];
    fallbackMarkets: FallbackMarketExposure[];
    blockedSignals: BlockedSignalView[];
    incidentSummary: {
      activeMajor: number;
      activeWarning: number;
      resolvedToday: number;
      weightedActiveCount: number;
      impact: "Low" | "Moderate" | "High";
    };
  };
};
