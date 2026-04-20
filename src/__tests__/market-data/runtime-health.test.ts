import {
  classifyProviderStateFromAge,
  computeScannerFreshnessState,
  evaluatePublicationGate,
} from "@/lib/market-data/core/runtime-health";
import { finishCoverage, getCoverageSnapshots, markScanned, markSkipped, resetCoverageSnapshotsForTests, startCoverage } from "@/lib/scanner/coverage";

describe("runtime health recovery", () => {
  beforeEach(() => {
    resetCoverageSnapshotsForTests();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-19T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("marks provider degraded when socket is open but messages are stale", () => {
    expect(classifyProviderStateFromAge(2_000, "live")).toBe("live");
    expect(classifyProviderStateFromAge(9_000, "live")).toBe("degraded");
    expect(classifyProviderStateFromAge(20_000, "live")).toBe("degraded");
  });

  it("restores scanner freshness from completed cycles, not cycle start only", () => {
    const now = Date.now();
    expect(computeScannerFreshnessState({
      scanMode: "full",
      lastSuccessfulCycleAgeMs: null,
      recoveryActive: false,
      usableCoveragePct: 0,
      providerState: "degraded",
    })).toBe("STALE");

    expect(computeScannerFreshnessState({
      scanMode: "full",
      lastSuccessfulCycleAgeMs: now - now + 30_000,
      recoveryActive: false,
      usableCoveragePct: 80,
      providerState: "live",
    })).toBe("LIVE");
  });

  it("makes partially successful cycles recover scanner health when usable coverage is good enough", () => {
    startCoverage({
      market: "crypto",
      totalSymbols: 10,
      phase: "phase_1_core",
      coreTarget: 10,
      priorityTarget: 0,
      extendedTarget: 0,
      snapshotRestored: false,
      degradedReasons: [],
    });

    for (let index = 0; index < 7; index += 1) {
      markScanned("crypto", "core", "live");
    }
    for (let index = 0; index < 3; index += 1) {
      markSkipped("crypto", "rate_limited");
    }

    finishCoverage("crypto", {
      startedAt: Date.now() - 1_500,
      providerStatus: "healthy",
      providerBackoffActive: false,
      providerCooldownUntil: null,
      providerAvailability: "up",
      degradedReasons: [],
      snapshotRestored: false,
    });

    const snapshot = getCoverageSnapshots().find((entry) => entry.market === "crypto");
    expect(snapshot?.usableCoveragePct).toBe(70);
    expect(snapshot?.degradedMode).toBe(false);
    expect(snapshot?.lastSuccessfulScanMs).not.toBeNull();
    expect(snapshot?.lastPublishEligibleCycleAt).not.toBeNull();
  });

  it("blocks publication while stale and resumes when freshness and coverage recover", () => {
    const blocked = evaluatePublicationGate({
      providerState: "degraded",
      dataAgeMs: 45_000,
      scannerFreshnessState: "STALE",
      usableCoveragePct: 30,
      blockerReason: "Live provider returned stale market data",
      snapshotAgeMs: null,
      scanMode: "reduced",
    });
    expect(blocked.publicationState).toBe("blocked");
    expect(blocked.publicationReasonCodes).toContain("BLOCKED_PRICE_TOO_OLD");
    expect(blocked.publicationReasonCodes).toContain("BLOCKED_STALE_SCANNER");

    const recovered = evaluatePublicationGate({
      providerState: "live",
      dataAgeMs: 2_000,
      scannerFreshnessState: "LIVE",
      usableCoveragePct: 82,
      blockerReason: null,
      snapshotAgeMs: null,
      scanMode: "full",
    });
    expect(recovered.publicationState).toBe("publishable");
    expect(recovered.marketFreshEnough).toBe(true);
    expect(recovered.coverageHealthyEnough).toBe(true);
  });

  it("keeps fallback publication conservative instead of blocking when snapshot is still signal-safe", () => {
    const result = evaluatePublicationGate({
      providerState: "degraded",
      dataAgeMs: 10_000,
      scannerFreshnessState: "LIVE",
      usableCoveragePct: 80,
      blockerReason: "Live providers unavailable; protected fallback active",
      snapshotAgeMs: 20_000,
      scanMode: "reduced",
    });

    expect(result.publicationState).toBe("conservative");
    expect(result.publicationReasonCodes).toContain("BLOCKED_FALLBACK_PRICE_ONLY");
  });
});
