export type AppRole = "GUEST" | "FREE" | "PREMIUM" | "ADMIN" | "SUPERADMIN";

export type MarketType = "CRYPTO" | "US" | "INDIA";
export type SignalType =
  | "BREAKOUT"
  | "REVERSAL"
  | "MOMENTUM"
  | "MEAN_REVERSION"
  | "TREND_CONTINUATION"
  | "VOLATILITY_EXPANSION";

export type SignalDirection = "LONG" | "SHORT";

export type SignalStatus =
  | "DETECTED"
  | "VALIDATED"
  | "PUBLISHED"
  | "TRIGGERED"
  | "CLOSED_TP"
  | "CLOSED_SL"
  | "EXPIRED"
  | "INVALIDATED"
  | "REJECTED"
  | "UNPUBLISHED";

export type SignalVisibility = "FREE_DELAYED" | "PREMIUM_ONLY" | "HIDDEN" | "ADMIN_ONLY";

export type ConfidenceBucket = "ELITE" | "STRONG" | "GOOD" | "WEAK";
export type FreshnessBadge = "FRESH" | "AGING" | "STALE";
