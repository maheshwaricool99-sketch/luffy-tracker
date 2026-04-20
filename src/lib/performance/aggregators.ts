import { CONFIDENCE_BUCKETS, PERFORMANCE_CLASSES, PERFORMANCE_MARKETS } from "./constants";
import type { PerformanceRecord, PerformanceSummary } from "./types";

function round(value: number | null, digits = 2) {
  if (value === null || !Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

function getWinRate(records: PerformanceRecord[]) {
  if (records.length === 0) return null;
  const wins = records.filter((record) => record.r > 0).length;
  return (wins / records.length) * 100;
}

function getAverageR(records: PerformanceRecord[]) {
  if (records.length === 0) return null;
  const total = records.reduce((sum, record) => sum + record.r, 0);
  return total / records.length;
}

function getBestStreak(records: PerformanceRecord[]) {
  if (records.length === 0) return null;
  let best = 0;
  let current = 0;
  for (const record of records) {
    if (record.r > 0) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

function getWorstDrawdown(records: PerformanceRecord[]) {
  if (records.length === 0) return null;
  let equity = 0;
  let peak = 0;
  let worst = 0;
  for (const record of records) {
    equity += record.r;
    peak = Math.max(peak, equity);
    worst = Math.min(worst, equity - peak);
  }
  return worst;
}

export function buildEquityCurve(records: PerformanceRecord[]) {
  let cumulative = 0;
  return records.map((record) => {
    cumulative += record.r;
    return {
      time: record.closedAt,
      value: round(cumulative, 4) ?? 0,
    };
  });
}

export function buildSummary(records: PerformanceRecord[], activeTrades: number, previous7d: PerformanceRecord[], current7d: PerformanceRecord[]): PerformanceSummary {
  const avgR = getAverageR(records);
  const current7dWinRate = getWinRate(current7d);
  const previous7dWinRate = getWinRate(previous7d);
  return {
    winRate: round(getWinRate(records), 2),
    winRateChange7d: current7dWinRate === null || previous7dWinRate === null ? null : round(current7dWinRate - previous7dWinRate, 2),
    expectancy: round(avgR, 2),
    avgR: round(avgR, 2),
    closedTrades: records.length,
    activeTrades,
    bestStreak: getBestStreak(records),
    worstDrawdownR: round(getWorstDrawdown(records), 2),
  };
}

function buildGroupMetrics(records: PerformanceRecord[]) {
  return {
    closedTrades: records.length,
    winRate: round(getWinRate(records), 2),
    expectancy: round(getAverageR(records), 2),
  };
}

export function buildBreakdowns(records: PerformanceRecord[]) {
  const byMarket = PERFORMANCE_MARKETS.map((market) => ({
    market,
    ...buildGroupMetrics(records.filter((record) => record.market === market)),
  }));

  const byConfidence = CONFIDENCE_BUCKETS.map((bucket) => ({
    bucket: bucket.label,
    ...buildGroupMetrics(records.filter((record) => record.confidence >= bucket.min && record.confidence <= bucket.max)),
  }));

  const byClass = PERFORMANCE_CLASSES.map((signalClass) => ({
    class: signalClass,
    ...buildGroupMetrics(records.filter((record) => record.signalClass === signalClass)),
  }));

  return { byMarket, byConfidence, byClass };
}
