import { NAV_ITEMS } from "@/config/navigation";
import { HealthGrid } from "@/components/app/terminal-pages";
import { renderToStaticMarkup } from "react-dom/server";

describe("public surface", () => {
  it("does not expose tracker or portfolio navigation", () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);
    const labels = NAV_ITEMS.map((item) => item.label.toLowerCase());
    expect(hrefs).not.toContain("/tracker/advanced");
    expect(hrefs).not.toContain("/tracker/expert");
    expect(hrefs).not.toContain("/tracker/ace");
    expect(hrefs).not.toContain("/portfolio");
    expect(labels.join(" ")).not.toContain("tracker");
    expect(labels.join(" ")).not.toContain("portfolio");
  });

  it("renders degraded state on health surface", () => {
    const html = renderToStaticMarkup(
      <HealthGrid
        health={{
          degraded: true,
          degradedReasons: ["stale-data"],
          snapshotRestoreActive: false,
          engine: {
            status: "warming",
            inFlight: true,
            lastRun: 0,
            publishedCount: 0,
            restoredSignals: 0,
          },
          sourceHealth: [{
            market: "crypto",
            open: true,
            freshness: "GOOD",
            lastSyncTs: Date.now(),
            fallbackActive: false,
            primarySource: "okx",
            dataState: "live",
            providerStatus: "degraded",
            providerBackoffActive: false,
            providerCooldownUntil: null,
            coveragePct: 50,
            warmupPhase: "phase_1_core",
            liveCount: 5,
            cachedCount: 0,
            restoredCount: 0,
            staleCount: 0,
          }],
          scanner: [{
            market: "crypto",
            usableCoveragePct: 50,
            coreCoveragePct: 50,
            priorityCoveragePct: 0,
            extendedCoveragePct: 0,
            warmupPhase: "phase_1_core",
            providerStatus: "degraded",
            providerBackoffActive: false,
            providerCooldownUntil: null,
            providerAvailability: "partial",
            liveCount: 5,
            delayedCount: 0,
            cachedCount: 0,
            restoredCount: 0,
            staleCount: 0,
            unavailableCount: 0,
            skippedCount: 0,
            skipReasons: {},
            totalSymbols: 10,
            totalSymbolsAttempted: 5,
            totalSymbolsRejected: 0,
            scannedSymbols: 5,
            coreTarget: 10,
            priorityTarget: 0,
            extendedTarget: 0,
            lastGoodScanAt: null,
            lastCycleStartedAt: Date.now(),
            lastCycleCompletedAt: Date.now(),
            lastPriorityScanAt: null,
            lastFullScanAt: null,
            lastSnapshotAt: null,
            snapshotRestored: false,
            degradedMode: true,
            degradedReasons: ["stale-data"],
            lastScanTime: Date.now(),
            lastSuccessfulScanMs: Date.now(),
            lastPublishEligibleCycleAt: null,
            scanDurationMs: 1000,
            cacheReliancePct: 0,
            warmupCompletePct: 50,
            dataState: "live",
            freshness: "GOOD",
            coveragePct: 50,
          }],
          providers: [],
          modelLatency: {
            continuation_model: { avgMs: 0, invalidCount: 0, outputCount: 0 },
            breakout_model: { avgMs: 0, invalidCount: 0, outputCount: 0 },
            reversal_model: { avgMs: 0, invalidCount: 0, outputCount: 0 },
            high_confidence_filter: { avgMs: 0, invalidCount: 0, outputCount: 0 },
            early_detection_filter: { avgMs: 0, invalidCount: 0, outputCount: 0 },
          },
          validationFailures: {},
          fallbackUsage: {},
          skipReasons: {},
        }}
      />,
    );
    expect(html).toContain("Degraded");
    expect(html).toContain("Feed Health Table");
  });
});
