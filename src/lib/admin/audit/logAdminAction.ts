import { randomUUID } from "node:crypto";
import { getDb, nowIso } from "@/lib/db";

export function logAdminAction(input: {
  adminUserId: string;
  actionType: string;
  targetType: "SIGNAL" | "USER" | "ALERT" | "CONFIG";
  targetId: string;
  reason?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
}) {
  getDb().prepare(`
    INSERT INTO admin_audit_logs (
      id, actor_user_id, target_user_id, action_type, entity_type, entity_id, before_json, after_json, reason, created_at
    ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    input.adminUserId,
    input.actionType,
    input.targetType,
    input.targetId,
    JSON.stringify(input.beforeState ?? {}),
    JSON.stringify(input.afterState ?? {}),
    input.reason ?? null,
    nowIso(),
  );
}
