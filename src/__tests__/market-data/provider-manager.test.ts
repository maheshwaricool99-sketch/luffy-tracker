import { computeMarketHealthScore } from "@/lib/market-data/core/health-score";
import { nextBackoffDelayMs } from "@/lib/market-data/managers/provider-state-machine";

describe("market data resilience", () => {
  it("caps exponential backoff", () => {
    expect(nextBackoffDelayMs(1)).toBe(2_000);
    expect(nextBackoffDelayMs(2)).toBe(4_000);
    expect(nextBackoffDelayMs(5)).toBe(30_000);
    expect(nextBackoffDelayMs(12)).toBe(30_000);
  });

  it("scores degraded recovery accurately", () => {
    const score = computeMarketHealthScore({
      providerState: "fallback",
      dataAgeMs: 75_000,
      coveragePct: 62,
      recoveryLevel: "rotating",
      publishable: false,
    });

    expect(score.score).toBeLessThan(40);
    expect(score.label).toBe("Down");
  });

  it("keeps healthy live market operational", () => {
    const score = computeMarketHealthScore({
      providerState: "live",
      dataAgeMs: 2_000,
      coveragePct: 100,
      recoveryLevel: "none",
      publishable: true,
    });

    expect(score.score).toBe(100);
    expect(score.label).toBe("Operational");
  });
});
