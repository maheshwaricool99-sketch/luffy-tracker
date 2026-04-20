import type { PerformanceApiResponse, PerformanceRole } from "./types";

function roundSummaryForGuest(payload: PerformanceApiResponse) {
  return {
    ...payload.summary,
    winRate: payload.summary.winRate === null ? null : Math.round(payload.summary.winRate),
    avgR: null,
    expectancy: null,
    bestStreak: null,
    worstDrawdownR: null,
  };
}

export function serializePerformanceByRole(payload: PerformanceApiResponse, role: PerformanceRole): PerformanceApiResponse {
  if (role === "ADMIN") return payload;

  if (role === "PREMIUM") {
    return {
      ...payload,
      admin: undefined,
    };
  }

  if (role === "FREE") {
    return {
      ...payload,
      summary: {
        ...payload.summary,
        expectancy: null,
      },
      equityCurve: [],
      breakdown: {
        ...payload.breakdown,
        byClass: [],
      },
      trades: payload.trades.slice(0, 5),
      admin: undefined,
    };
  }

  return {
    ...payload,
    summary: roundSummaryForGuest(payload),
    equityCurve: [],
    breakdown: {
      byMarket: payload.breakdown.byMarket,
      byConfidence: [],
      byClass: [],
    },
    trades: payload.trades.slice(0, 3),
    admin: undefined,
  };
}
