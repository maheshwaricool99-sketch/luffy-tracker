import { canTransitionSignalState } from "../validation/signalStateMachine";
import { validateSignalForPublish } from "../validation/validateSignalForPublish";
import { getSignalRow, logSignalAdminMutation, mutateSignalLifecycle, writeSignalEvent } from "./shared";
import { canPublishSignal, runtimeConfig } from "@/lib/runtime";

export async function publishSignal(signalId: string, adminUserId: string, reason: string, force = false) {
  canPublishSignal((await runtimeConfig.getAll()).flags);
  const before = getSignalRow(signalId);
  if (!before) throw new Error("Signal not found");
  const currentStatus = String(before.lifecycle_state ?? "UNPUBLISHED").toUpperCase();
  const validation = validateSignalForPublish(before);
  if (!force && !validation.ok) throw new Error(validation.issues.map((issue) => issue.message).join(", "));
  if (!force && !canTransitionSignalState(currentStatus as never, "PUBLISHED")) {
    throw new Error("Invalid state transition");
  }

  mutateSignalLifecycle(signalId, "published", { adminOverride: force, adminOverrideReason: force ? reason : null });
  writeSignalEvent({ signalId, eventType: force ? "ADMIN_OVERRIDE" : "PUBLISHED", actorType: "ADMIN", actorUserId: adminUserId, payload: { reason, force } });
  const after = getSignalRow(signalId);
  logSignalAdminMutation({ adminUserId, signalId, actionType: "publish", reason, beforeState: before, afterState: after ?? {} });
  return { ok: true, signalId, newStatus: "PUBLISHED", publishedAt: String(after?.updated_at ?? new Date().toISOString()) };
}
