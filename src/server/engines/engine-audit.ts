import { randomUUID } from "node:crypto";
import { getDb, nowIso, parseJson } from "@/lib/db";
import type { EngineAuditEvent } from "./engine-types";

export type RecordEngineAuditInput = {
  engine: string;
  action: string;
  result: "accepted" | "success" | "failed";
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
};

export function recordEngineAudit(input: RecordEngineAuditInput): EngineAuditEvent {
  const id = randomUUID();
  const createdAt = nowIso();
  const metadata = input.metadata ?? {};
  getDb().prepare(`
    INSERT INTO engine_audit_events (
      id, engine, action, result, actor_user_id, actor_email, actor_role, reason, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.engine,
    input.action,
    input.result,
    input.actorId ?? null,
    input.actorEmail ?? null,
    input.actorRole ?? null,
    input.reason ?? null,
    JSON.stringify(metadata),
    createdAt,
  );
  console.info("[engine.audit]", {
    engine: input.engine,
    action: input.action,
    result: input.result,
    actor: input.actorEmail ?? input.actorId ?? "system",
    reason: input.reason ?? undefined,
  });
  return {
    id,
    engine: input.engine,
    action: input.action,
    result: input.result,
    actorId: input.actorId ?? null,
    actorEmail: input.actorEmail ?? null,
    actorRole: input.actorRole ?? null,
    reason: input.reason ?? null,
    metadata,
    createdAt,
  };
}

export function listEngineAuditEvents(engine: string | null, limit = 20): EngineAuditEvent[] {
  const db = getDb();
  const rows = (engine
    ? db.prepare(`SELECT * FROM engine_audit_events WHERE engine = ? ORDER BY created_at DESC LIMIT ?`).all(engine, limit)
    : db.prepare(`SELECT * FROM engine_audit_events ORDER BY created_at DESC LIMIT ?`).all(limit)
  ) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    engine: String(row.engine),
    action: String(row.action),
    result: String(row.result) as EngineAuditEvent["result"],
    actorId: row.actor_user_id ? String(row.actor_user_id) : null,
    actorEmail: row.actor_email ? String(row.actor_email) : null,
    actorRole: row.actor_role ? String(row.actor_role) : null,
    reason: row.reason ? String(row.reason) : null,
    metadata: parseJson<Record<string, unknown>>(row.metadata_json, {}),
    createdAt: String(row.created_at),
  }));
}
