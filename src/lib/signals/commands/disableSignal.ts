import { getSignalRow, logSignalAdminMutation, mutateSignalLifecycle, writeSignalEvent } from "./shared";
import { assertWritableOrThrow, runtimeConfig } from "@/lib/runtime";

export async function disableSignal(signalId: string, adminUserId: string, reason: string) {
  assertWritableOrThrow((await runtimeConfig.getAll()).flags);
  const before = getSignalRow(signalId);
  if (!before) throw new Error("Signal not found");
  mutateSignalLifecycle(signalId, "rejected", { hidden: true, invalidReason: reason });
  writeSignalEvent({ signalId, eventType: "REJECTED", actorType: "ADMIN", actorUserId: adminUserId, payload: { reason } });
  const after = getSignalRow(signalId);
  logSignalAdminMutation({ adminUserId, signalId, actionType: "disable", reason, beforeState: before, afterState: after ?? {} });
  return { ok: true, signalId, newStatus: "REJECTED" };
}
