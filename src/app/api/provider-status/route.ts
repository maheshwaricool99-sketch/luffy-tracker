import { getRecoveryController } from "@/lib/market-data/recovery/recovery-controller";
import { getAllProviderManagers } from "@/lib/market-data/managers/provider-manager";

export const dynamic = "force-dynamic";

export async function GET() {
  getRecoveryController();
  const markets = getAllProviderManagers().map((manager) => {
    const status = manager.getStatus();
    return {
      market: status.market,
      currentProvider: status.activeProviderId,
      providerState: status.providerState,
      consecutiveFailures: status.providers.find((item) => item.providerId === status.activeProviderId)?.consecutiveFailures ?? 0,
      nextRetryAt: status.providers.find((item) => item.providerId === status.activeProviderId)?.nextRetryAtMs ?? null,
      activeFallback: status.snapshotActive,
      lastSuccess: status.lastProviderSuccessMs,
      lastFailure: status.lastProviderFailureMs,
      activeRecoveryAction: status.recovery.estimatedNextAction,
      freshnessAgeMs: status.dataAgeMs,
      publicationState: status.publicationState,
      publicationReasonCodes: status.publicationReasonCodes,
      blockingConditions: status.blockingConditions,
      providers: status.providers,
    };
  });
  return Response.json({ markets }, { headers: { "Cache-Control": "no-store" } });
}
