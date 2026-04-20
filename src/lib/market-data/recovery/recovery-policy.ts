import { FORCED_RESET_AFTER_MS, RECOVERY_LOOP_INTERVAL_MS, SNAPSHOT_SAFE_DISPLAY_TTL_MS } from "@/lib/market-data/core/constants";

export const recoveryPolicy = {
  forcedResetAfterMs: FORCED_RESET_AFTER_MS,
  snapshotExpiryMs: SNAPSHOT_SAFE_DISPLAY_TTL_MS,
  loopIntervalMs: RECOVERY_LOOP_INTERVAL_MS,
};
