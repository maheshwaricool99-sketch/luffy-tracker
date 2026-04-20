import { buildBreakdowns, buildEquityCurve, buildSummary } from "@/lib/performance/aggregators";
import { validateClosedPerformanceRow } from "@/lib/performance/validators";
import type { PerformanceRecord } from "@/lib/performance/types";

function makeTrade(overrides: Partial<PerformanceRecord> = {}): PerformanceRecord {
  return {
    id: overrides.id ?? "trade-1",
    signalId: overrides.signalId ?? "trade-1",
    symbol: overrides.symbol ?? "BTCUSDT",
    market: overrides.market ?? "CRYPTO",
    direction: overrides.direction ?? "LONG",
    signalClass: overrides.signalClass ?? "ELITE",
    confidence: overrides.confidence ?? 92,
    entry: overrides.entry ?? 100,
    stop: overrides.stop ?? 95,
    target: overrides.target ?? 110,
    expectedR: overrides.expectedR ?? 2,
    source: overrides.source ?? "LIVE",
    sourceRaw: overrides.sourceRaw ?? "LIVE_PROVIDER",
    sourceLabel: overrides.sourceLabel ?? "Live Engine",
    openedAt: overrides.openedAt ?? 1_000,
    closedAt: overrides.closedAt ?? 2_000,
    updatedAt: overrides.updatedAt ?? 2_000,
    ingestionAt: overrides.ingestionAt ?? 1_000,
    outcome: overrides.outcome ?? "TP",
    r: overrides.r ?? 2,
    exit: overrides.exit ?? 110,
    resultPct: overrides.resultPct ?? 10,
    timeHeldMs: overrides.timeHeldMs ?? 1_000,
  };
}

describe("performance aggregation", () => {
  it("builds summary from closed trades only", () => {
    const trades = [
      makeTrade({ id: "win-1", r: 2, closedAt: 1_000 }),
      makeTrade({ id: "loss-1", r: -1, outcome: "SL", exit: 95, resultPct: -5, closedAt: 2_000 }),
      makeTrade({ id: "timeout-1", r: 0, outcome: "TIMEOUT", exit: 100, resultPct: 0, closedAt: 3_000 }),
    ];

    const summary = buildSummary(trades, 4, trades.slice(0, 1), trades.slice(1));

    expect(summary.closedTrades).toBe(3);
    expect(summary.activeTrades).toBe(4);
    expect(summary.winRate).toBeCloseTo(33.33, 2);
    expect(summary.avgR).toBeCloseTo(0.33, 2);
    expect(summary.expectancy).toBeCloseTo(0.33, 2);
  });

  it("builds equity curve in chronological order", () => {
    const curve = buildEquityCurve([
      makeTrade({ id: "a", closedAt: 1_000, r: 1 }),
      makeTrade({ id: "b", closedAt: 2_000, r: -1 }),
      makeTrade({ id: "c", closedAt: 3_000, r: 2 }),
    ]);

    expect(curve).toEqual([
      { time: 1_000, value: 1 },
      { time: 2_000, value: 0 },
      { time: 3_000, value: 2 },
    ]);
  });

  it("builds breakdowns from the same filtered trade scope", () => {
    const breakdowns = buildBreakdowns([
      makeTrade({ id: "crypto", market: "CRYPTO", signalClass: "ELITE", confidence: 93, r: 2 }),
      makeTrade({ id: "us", market: "US", signalClass: "STRONG", confidence: 84, r: -1, outcome: "SL", exit: 95, resultPct: -5 }),
    ]);

    expect(breakdowns.byMarket.find((row) => row.market === "CRYPTO")?.closedTrades).toBe(1);
    expect(breakdowns.byMarket.find((row) => row.market === "INDIA")?.closedTrades).toBe(0);
    expect(breakdowns.byClass.find((row) => row.class === "ELITE")?.expectancy).toBe(2);
    expect(breakdowns.byConfidence.find((row) => row.bucket === "80-89")?.closedTrades).toBe(1);
  });
});

describe("performance row validation", () => {
  it("rejects non-finalized lifecycle rows", () => {
    const result = validateClosedPerformanceRow({
      id: "open-1",
      lifecycle_state: "open",
      source_state: "SNAPSHOT",
    });

    expect(result.trade).toBeNull();
    expect(result.exclusion?.reason).toBe("NON_FINALIZED_LIFECYCLE");
  });

  it("normalizes finalized signal rows into closed trades", () => {
    const result = validateClosedPerformanceRow({
      id: "closed-1",
      symbol: "ETHUSDT",
      market: "crypto",
      direction: "long",
      class: "elite",
      confidence: 91,
      entry_value: 100,
      stop_value: 95,
      target_value: 110,
      expected_r: 2,
      source_state: "LIVE_PROVIDER",
      published_at: "2026-04-17T00:00:00.000Z",
      updated_at: "2026-04-17T03:00:00.000Z",
      lifecycle_state: "closed_tp",
    });

    expect(result.trade).not.toBeNull();
    expect(result.trade?.outcome).toBe("TP");
    expect(result.trade?.r).toBe(2);
    expect(result.trade?.sourceLabel).toBe("Live Engine");
  });
});
