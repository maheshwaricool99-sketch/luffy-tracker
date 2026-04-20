import type { Timeframe, Verdict } from "./types";

export const ANALYSIS_TIMEFRAMES: Timeframe[] = ["5m", "15m", "1H", "4H", "1D", "1W"];

export const VERDICT_LABELS: Record<Verdict, string> = {
  STRONG_LONG: "Strong Long",
  LONG: "Long",
  NEUTRAL: "Neutral",
  SHORT: "Short",
  STRONG_SHORT: "Strong Short",
};

export const VERDICT_TONES: Record<Verdict, string> = {
  STRONG_LONG: "text-emerald-300",
  LONG: "text-emerald-400",
  NEUTRAL: "text-[var(--text-soft)]",
  SHORT: "text-rose-400",
  STRONG_SHORT: "text-rose-300",
};

export const ANALYSIS_CACHE_SECONDS = 10;
export const ANALYSIS_STALE_WHILE_REVALIDATE_SECONDS = 30;

export const ANALYSIS_VERSION = "v1.0.0";
export const ANALYSIS_MODEL_VERSION = "ai-scorer-local-v1";
