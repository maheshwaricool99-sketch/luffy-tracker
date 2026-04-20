import { getRecoveryController } from "@/lib/market-data/recovery/recovery-controller";
import { getAllProviderManagers } from "@/lib/market-data/managers/provider-manager";

export const dynamic = "force-dynamic";

export async function GET() {
  getRecoveryController();
  const markets = getAllProviderManagers().map((manager) => {
    const status = manager.getStatus();
    return {
      market: status.market,
      scanMode: status.scanMode,
      totalSymbols: status.scannerStatus.totalSymbols,
      symbolsAttempted: status.scannerStatus.symbolsAttempted,
      symbolsScanned: status.scannerStatus.symbolsScanned,
      symbolsSkipped: status.scannerStatus.symbolsSkipped,
      usableCoveragePct: status.scannerStatus.usableCoveragePct,
      skipReasons: status.scannerStatus.skipReasons,
      freshnessState: status.scannerStatus.freshnessState,
      publishEligible: status.scannerStatus.publishEligible,
      lastCycleStarted: status.scannerStatus.lastCycleStartedMs,
      lastCycleCompleted: status.scannerStatus.lastCycleCompletedMs,
      lastScanAttempt: status.scannerStatus.lastScanAttemptMs,
      lastSuccessfulScan: status.scannerStatus.lastSuccessfulScanMs,
      lastPublishEligibleCycle: status.scannerStatus.lastPublishEligibleCycleMs,
    };
  });
  return Response.json({ markets }, { headers: { "Cache-Control": "no-store" } });
}
