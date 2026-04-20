import type { SignalsPulseDto } from "../types/signalDtos";
import type { AppRole, MarketType } from "../types/signalEnums";

export function serializeSignalsPulseByRole(input: {
  role: AppRole;
  activeSignals: number;
  averageConfidence: number;
  total: number;
  crypto: number;
  us: number;
  india: number;
  lastSignal: { symbol: string | null; market: MarketType | null; publishedAt: string | null; freshnessBadge: "FRESH" | "AGING" | "STALE" | null };
  bullishPct: number;
  neutralPct: number;
  bearishPct: number;
  winRate30d: number | null;
}): SignalsPulseDto {
  const delayed = input.role === "GUEST" || input.role === "FREE";
  return {
    role: input.role,
    delayed,
    activeSignals: input.activeSignals,
    averageConfidence: input.averageConfidence,
    todayCounts: {
      total: input.total,
      crypto: input.crypto,
      us: input.us,
      india: input.india,
    },
    lastSignal: input.lastSignal,
    marketSentiment: {
      bullishPct: input.bullishPct,
      neutralPct: input.neutralPct,
      bearishPct: input.bearishPct,
    },
    winRate30d: {
      value: input.role === "PREMIUM" || input.role === "ADMIN" || input.role === "SUPERADMIN" ? input.winRate30d : null,
      locked: !(input.role === "PREMIUM" || input.role === "ADMIN" || input.role === "SUPERADMIN"),
    },
  };
}
