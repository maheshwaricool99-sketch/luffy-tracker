import { getRecoveryController } from "@/lib/market-data/recovery/recovery-controller";
import { getAllProviderManagers } from "@/lib/market-data/managers/provider-manager";

export const dynamic = "force-dynamic";

export async function GET() {
  getRecoveryController();
  const markets = getAllProviderManagers().map((manager) => manager.getStatus()).map((status) => ({
    market: status.market,
    recoveryActive: status.recovery.active,
    retryAttemptNumber: status.recovery.retryAttempt,
    lastResetTime: status.recovery.lastResetAtMs,
    lastProviderSwitch: status.recovery.lastProviderSwitchAtMs,
    snapshotAge: status.recovery.snapshotAgeMs,
    estimatedNextAction: status.recovery.estimatedNextAction,
    blockerReason: status.recovery.blockerReason,
  }));
  return Response.json({ markets }, { headers: { "Cache-Control": "no-store" } });
}
