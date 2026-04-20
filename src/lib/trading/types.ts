/**
 * TRADING PORTFOLIO — CORE TYPE DEFINITIONS
 * Single source of truth for all trading domain types.
 */

// ── Engine identifiers ────────────────────────────────────────────────────────

export type EngineId = "luffy" | "luffy-lite" | "advanced" | "expert" | "ace";

export const ENGINE_PRIORITY: Record<EngineId, number> = {
  "luffy":        1, // highest — most sophisticated
  "luffy-lite":   2,
  "advanced":     3,
  "expert":       4,
  "ace":          5,
};

// ── Candidate ─────────────────────────────────────────────────────────────────

export type CandidateSide = "LONG" | "SHORT";

export type EntryPlan = {
  low: number;
  high: number;
  mid: number;
};

export type Candidate = {
  id: string;
  sourceEngine: EngineId;
  strategyId: string;
  symbol: string;
  side: CandidateSide;
  setupType: string;
  timeframe: string;

  entryPlan: EntryPlan;
  stopPlan: number;
  targetPlan: number;

  confidence: number;      // 0–100
  netEdgeR: number;        // expected R:R edge (e.g. 0.9 = 90% of stated R)
  strategyScore: number;   // raw engine score (0–200+)

  candidateCreatedAtMs: number;
  candidateExpiryAtMs: number;  // 3 candles of timeframe

  // Filled by ranking service before evaluation
  finalRankScore?: number;
  rankingBreakdown?: Record<string, number>;
  reasonTags?: string[];
};

// ── Claim ─────────────────────────────────────────────────────────────────────

export type ClaimStatus =
  | "pending"    // submitted, awaiting evaluation
  | "granted"    // approved, execution in progress
  | "filled"     // trade opened
  | "rejected"   // blocked by dedup/risk
  | "expired";   // TTL elapsed

export type RejectionReason =
  | "DUPLICATE_SYMBOL"
  | "PENDING_CLAIM_EXISTS"
  | "COOLDOWN_ACTIVE"
  | "RISK_MAX_TRADES"
  | "RISK_EXPOSURE_CAP"
  | "RISK_CORRELATED"
  | "RISK_SAME_DIRECTION"
  | "RISK_DAILY_LOSS"
  | "RISK_KILL_SWITCH"
  | "STALE_PRICE"
  | "INVALID_CANDIDATE"
  | "EXPIRED"
  | "NO_WS_PRICE"
  | "ENGINE_CAP";

export type Claim = {
  id: string;
  candidateId: string;
  symbol: string;
  side: CandidateSide;
  sourceEngine: EngineId;

  status: ClaimStatus;
  createdAtMs: number;
  expiresAtMs: number;
  grantedAtMs?: number;
  filledAtMs?: number;
  rejectedAtMs?: number;

  tradeId?: string;
  rejectionReason?: RejectionReason;
  rejectionDetail?: string;
};

// ── Trade ─────────────────────────────────────────────────────────────────────

export type TradeStatus =
  | "open"
  | "closed"
  | "error";

export type CloseReason =
  | "STOP_HIT"
  | "TARGET_HIT"
  | "MANUAL"
  | "EXPIRED"
  | "ERROR"
  | "RISK_OVERRIDE"
  | "RECONCILIATION";

export type Trade = {
  id: string;
  claimId: string;
  candidateId: string;
  sourceEngine: EngineId;

  symbol: string;
  side: CandidateSide;
  status: TradeStatus;
  setupType: string;
  timeframe: string;

  // Prices
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  currentPrice: number;

  // Sizing
  quantity: number;
  notionalUsd: number;
  marginUsd: number;

  // PnL (paper)
  entryFeeUsd: number;
  unrealizedPnlUsd: number;
  realizedPnlUsd?: number;
  pnlPct?: number;

  // Timing
  openedAtMs: number;
  lastUpdateMs: number;
  closedAtMs?: number;

  // Metadata
  closeReason?: CloseReason;
  closeDetail?: string;
  rr?: number;           // R:R at close
  peakUnrealizedUsd?: number;
  troughUnrealizedUsd?: number;

  // Signal context (for display)
  signalEntry?: string;
  note?: string;
};

// ── Events ────────────────────────────────────────────────────────────────────

export type TradingEventType =
  | "candidate.created"
  | "candidate.rejected"
  | "claim.attempted"
  | "claim.granted"
  | "claim.rejected"
  | "risk.approved"
  | "risk.blocked"
  | "order.submitted"
  | "order.filled"
  | "order.failed"
  | "reconciliation.mismatch"
  | "trade.closed"
  | "degraded_mode.entered"
  | "degraded_mode.exited";

export type TradingEvent = {
  id: string;
  type: TradingEventType;
  ts: number;
  sourceEngine?: EngineId;
  symbol?: string;
  tradeId?: string;
  claimId?: string;
  candidateId?: string;
  payload: Record<string, unknown>;
};

// ── Portfolio snapshot ────────────────────────────────────────────────────────

export type EngineSlotState = {
  engine: EngineId;
  openTrades: number;
  maxTrades: number;
  replacementNeeded: boolean;
  replacementBlockedReason?: string;
  lastCloseMs?: number;
  availableCandidateCount: number;
};

export type PortfolioSnapshot = {
  snapshotAtMs: number;

  // Aggregate PnL
  totalOpenTrades: number;
  totalRealizedPnlUsd: number;
  totalUnrealizedPnlUsd: number;
  dailyPnlUsd: number;
  dailyPnlPct: number;

  // Risk state
  killSwitchActive: boolean;
  degradedMode: boolean;
  degradedReason?: string;

  // Per-engine slots
  engines: EngineSlotState[];

  // Trades
  openTrades: Trade[];
  recentClosed: Trade[];   // last 50 closed
};

// ── Risk config ───────────────────────────────────────────────────────────────

export type RiskConfig = {
  paperEquityUsd: number;
  maxRiskPerTradePct: number;   // e.g. 0.02 = 2%
  maxTotalExposurePct: number;  // e.g. 0.40 = 40%
  maxSameDirectionPct: number;  // e.g. 0.30 = 30% per side
  maxOpenPerEngine: number;     // e.g. 5
  maxOpenTotal: number;         // e.g. 20
  dailyLossLimitPct: number;    // e.g. 0.10 = 10%
  claimCooldownMs: number;      // ms after close before re-entry same symbol
  candidateExpiryCandles: number; // e.g. 3 → expiry = 3 × candle duration
};

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  paperEquityUsd: 10_000,
  maxRiskPerTradePct: 0.02,
  maxTotalExposurePct: 0.50,
  maxSameDirectionPct: 0.35,
  maxOpenPerEngine: 5,
  maxOpenTotal: 25,
  dailyLossLimitPct: 0.10,
  claimCooldownMs: 5 * 60_000,
  candidateExpiryCandles: 3,
};

// ── Timeframe helpers ─────────────────────────────────────────────────────────

const TF_MS: Record<string, number> = {
  "1m":  60_000,
  "3m":  3 * 60_000,
  "5m":  5 * 60_000,
  "15m": 15 * 60_000,
  "30m": 30 * 60_000,
  "1h":  60 * 60_000,
  "2h":  2 * 60 * 60_000,
  "4h":  4 * 60 * 60_000,
  "6h":  6 * 60 * 60_000,
  "12h": 12 * 60 * 60_000,
  "1d":  24 * 60 * 60_000,
};

export function candleDurationMs(timeframe: string): number {
  return TF_MS[timeframe] ?? TF_MS["4h"];
}

export function candidateExpiryMs(timeframe: string, candles = 3): number {
  return candleDurationMs(timeframe) * candles;
}

// ── Utility: unique ID ────────────────────────────────────────────────────────

export function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
