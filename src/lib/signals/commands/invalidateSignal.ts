import { getSignalRow, logSignalAdminMutation, mutateSignalLifecycle, writeSignalEvent } from "./shared";
import { assertWritableOrThrow, runtimeConfig } from "@/lib/runtime";

export async function invalidateSignal(signalId: string, adminUserId: string, reason: string) {
  assertWritableOrThrow((await runtimeConfig.getAll()).flags);
  const before = getSignalRow(signalId);
  if (!before) throw new Error("Signal not found");
  mutateSignalLifecycle(signalId, "invalidated", { invalidReason: reason });
  writeSignalEvent({ signalId, eventType: "INVALIDATED", actorType: "ADMIN", actorUserId: adminUserId, payload: { reason } });
  const after = getSignalRow(signalId);
  logSignalAdminMutation({ adminUserId, signalId, actionType: "invalidate", reason, beforeState: before, afterState: after ?? {} });
  return { ok: true, signalId, newStatus: "INVALIDATED", invalidatedAt: String(after?.updated_at ?? new Date().toISOString()) };
}
