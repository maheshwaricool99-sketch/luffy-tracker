import { getSnapshotAgeForMarket } from "@/lib/market-data/cache/snapshot-cache";
import { SNAPSHOT_SAFE_DISPLAY_TTL_MS } from "@/lib/market-data/core/constants";
import { appendAudit } from "@/lib/market-data/telemetry/audit-log";
import { emitMarketEvent } from "@/lib/market-data/telemetry/event-bus";
import { getAllProviderManagers } from "../managers/provider-manager";

class RecoveryController {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), 10_000);
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      for (const manager of getAllProviderManagers()) {
        appendAudit("RECOVERY_TRIGGERED", { market: manager.market });
        await manager.ensureHealthy();
        const status = manager.getStatus();
        const snapshotAgeMs = getSnapshotAgeForMarket(manager.market);
        if (snapshotAgeMs !== null && snapshotAgeMs > SNAPSHOT_SAFE_DISPLAY_TTL_MS) {
          appendAudit("SNAPSHOT_EXPIRE", { market: manager.market, snapshotAgeMs });
          emitMarketEvent("SNAPSHOT_EXPIRE", { market: manager.market, snapshotAgeMs });
        }
        appendAudit(status.recovery.active ? "RECOVERY_FAILED" : "RECOVERY_SUCCEEDED", {
          market: manager.market,
          providerState: status.providerState,
          blockerReason: status.recovery.blockerReason,
        });
      }
    } finally {
      this.running = false;
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
  }
}

const controller = globalThis.__recoveryController ?? new RecoveryController();

declare global {
  var __recoveryController: RecoveryController | undefined;
}

if (!globalThis.__recoveryController) globalThis.__recoveryController = controller;

export function getRecoveryController() {
  controller.start();
  return controller;
}

export function resetRecoveryControllerForTests() {
  controller.stop();
}
