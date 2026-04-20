import { getSignalRow, logSignalAdminMutation, mutateSignalLifecycle, writeSignalEvent } from "./shared";
import { assertWritableOrThrow, runtimeConfig } from "@/lib/runtime";

export async function unpublishSignal(signalId: string, adminUserId: string, reason: string) {
  assertWritableOrThrow((await runtimeConfig.getAll()).flags);
  const before = getSignalRow(signalId);
  if (!before) throw new Error("Signal not found");
  mutateSignalLifecycle(signalId, "unpublished", { invalidReason: reason });
  writeSignalEvent({ signalId, eventType: "UNPUBLISHED", actorType: "ADMIN", actorUserId: adminUserId, payload: { reason } });
  const after = getSignalRow(signalId);
  logSignalAdminMutation({ adminUserId, signalId, actionType: "unpublish", reason, beforeState: before, afterState: after ?? {} });
  return { ok: true, signalId, newStatus: "UNPUBLISHED" };
}
