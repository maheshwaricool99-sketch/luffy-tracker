import { projectCatalystRows, projectDerivativesRows, projectIndiaRows, projectLiquidationRows, projectPredictionRows, projectWhaleRows } from "@/lib/signals/terminal-projections";
import type { PublishedSignal } from "@/lib/signals/signal-types";

const signal: PublishedSignal = {
  id: "sig-1",
  symbol: "BTCUSDT",
  market: "crypto",
  direction: "long",
  confidence: 82,
  class: "strong",
  entry: 100,
  stopLoss: 95,
  takeProfit: 110,
  expectedR: 2,
  timestamp: Date.now(),
  regime: { trend: "bullish", volatility: "normal", liquidity: "healthy" },
  scoreBreakdown: { structure: 70, momentum: 65, volume: 68, volatility: 58, trend: 72, derivatives: 66, rr: 80 },
  rationale: ["Breakout and continuation aligned."],
  invalidatesOn: ["Loses support."],
  contributors: { advanced: 80, expert: 79, luffy: 88 },
  dataQuality: "healthy",
  sourceMeta: { primarySource: "okx", fallbackSource: "binance", priceAgeMs: 100, candleAgeMs: 1_000, dataState: "live" },
  lifecycleState: "published",
};

describe("terminal projections", () => {
  it("projects canonical signals into terminal-native rows", () => {
    expect(projectPredictionRows([signal])[0]).toMatchObject({ symbol: "BTCUSDT", class: "strong" });
    expect(projectWhaleRows([signal])[0]).toMatchObject({ symbol: "BTCUSDT", flowBias: "bullish" });
    expect(projectDerivativesRows([signal])[0]).toMatchObject({ symbol: "BTCUSDT" });
    expect(projectLiquidationRows([signal])[0]).toMatchObject({ symbol: "BTCUSDT" });
    expect(projectCatalystRows([signal])[0]).toMatchObject({ symbol: "BTCUSDT" });
  });

  it("keeps india projection isolated", () => {
    const india = { ...signal, id: "sig-2", symbol: "TCS", market: "india" as const };
    const rows = projectIndiaRows([india]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.symbol).toBe("TCS");
  });
});
