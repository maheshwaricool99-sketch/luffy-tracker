import { randomUUID } from "node:crypto";
import { getDb, nowIso, parseJson } from "@/lib/db";
import { logAdminAction } from "@/lib/admin/audit/logAdminAction";
import { publishSignalEvent } from "../realtime/publishSignalEvent";
import { signalChannelTopics } from "../realtime/signalChannelTopics";

export function getSignalRow(signalId: string) {
  return getDb().prepare("SELECT * FROM signal_records WHERE id = ?").get(signalId) as Record<string, unknown> | undefined;
}

export function writeSignalEvent(input: {
  signalId: string;
  eventType: string;
  actorType: "SYSTEM" | "ADMIN";
  actorUserId?: string | null;
  payload?: Record<string, unknown>;
}) {
  getDb().prepare(`
    INSERT INTO signal_events (id, signal_id, event_type, event_at, payload_json, actor_type, actor_user_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), input.signalId, input.eventType, nowIso(), JSON.stringify(input.payload ?? {}), input.actorType, input.actorUserId ?? null, nowIso());
}

export function mutateSignalLifecycle(signalId: string, lifecycleState: string, extraMeta: Record<string, unknown> = {}) {
  const db = getDb();
  const current = getSignalRow(signalId);
  if (!current) throw new Error("Signal not found");
  const meta = parseJson<Record<string, unknown>>(current.meta_json, {});
  db.prepare(`
    UPDATE signal_records
    SET lifecycle_state = ?, updated_at = ?, meta_json = ?
    WHERE id = ?
  `).run(lifecycleState, nowIso(), JSON.stringify({ ...meta, ...extraMeta }), signalId);
}

export function logSignalAdminMutation(input: {
  adminUserId: string;
  signalId: string;
  actionType: string;
  reason?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
}) {
  logAdminAction({
    adminUserId: input.adminUserId,
    actionType: input.actionType,
    targetType: "SIGNAL",
    targetId: input.signalId,
    reason: input.reason ?? null,
    beforeState: input.beforeState ?? {},
    afterState: input.afterState ?? {},
  });
  publishSignalEvent(signalChannelTopics.admin, { signalId: input.signalId, actionType: input.actionType });
}
