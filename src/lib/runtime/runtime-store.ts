import { randomUUID } from "node:crypto";
import { getDb, nowIso, parseJson } from "@/lib/db";
import type { RuntimeFlagMutationContext, RuntimeFlagRecord, RuntimeFlags, RuntimeFlagsSnapshot } from "./runtime-types";
import type { RuntimeFlagKey } from "./runtime-keys";
import { RuntimeFlagKeyList } from "./runtime-keys";

function emptyFlags(): RuntimeFlags {
  return {
    maintenance_mode: false,
    read_only_mode: false,
    disable_signup: false,
    pause_signal_publishing: false,
    pause_scanners: false,
    freeze_upgrades: false,
    pause_experiments: false,
  };
}

function rowToRecord(row: Record<string, unknown>): RuntimeFlagRecord {
  return {
    id: String(row.id),
    key: String(row.key) as RuntimeFlagKey,
    enabled: Boolean(row.enabled),
    valueJson: parseJson<Record<string, unknown> | null>(row.value_json, null),
    description: row.description ? String(row.description) : null,
    updatedByUserId: row.updated_by_user_id ? String(row.updated_by_user_id) : null,
    updatedAt: String(row.updated_at),
    createdAt: String(row.created_at),
    version: Number(row.version ?? 1),
  };
}

export function listRuntimeFlagRecords(): RuntimeFlagRecord[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM runtime_flags ORDER BY key ASC").all() as Array<Record<string, unknown>>;
  return rows.map(rowToRecord);
}

export function getRuntimeFlagRecord(key: RuntimeFlagKey): RuntimeFlagRecord | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM runtime_flags WHERE key = ?").get(key) as Record<string, unknown> | undefined;
  return row ? rowToRecord(row) : null;
}

export function readRuntimeFlagsSnapshot(): RuntimeFlagsSnapshot {
  const records = listRuntimeFlagRecords();
  const flags = emptyFlags();
  let version = 1;
  let updatedAt = new Date(0).toISOString();
  for (const record of records) {
    flags[record.key] = record.enabled;
    version = Math.max(version, record.version);
    if (record.updatedAt > updatedAt) updatedAt = record.updatedAt;
  }
  return {
    flags,
    updatedAt,
    version,
    lastLoadedAt: Date.now(),
  };
}

export function updateRuntimeFlag(
  key: RuntimeFlagKey,
  enabled: boolean,
  context: RuntimeFlagMutationContext,
  valueJson: Record<string, unknown> | null = null,
) {
  if (!RuntimeFlagKeyList.includes(key)) throw new Error(`Unknown runtime flag ${key}`);
  const db = getDb();
  const before = getRuntimeFlagRecord(key);
  const nextVersion = Number((db.prepare("SELECT COALESCE(MAX(version), 0) AS version FROM runtime_flags").get() as { version?: number } | undefined)?.version ?? 0) + 1;
  const now = nowIso();
  if (!before) {
    db.prepare(`
      INSERT INTO runtime_flags (id, key, enabled, value_json, description, updated_by_user_id, updated_at, created_at, version)
      VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)
    `).run(randomUUID(), key, enabled ? 1 : 0, valueJson ? JSON.stringify(valueJson) : null, context.actorUserId, now, now, nextVersion);
  } else {
    db.prepare(`
      UPDATE runtime_flags
      SET enabled = ?, value_json = ?, updated_by_user_id = ?, updated_at = ?, version = ?
      WHERE key = ?
    `).run(enabled ? 1 : 0, valueJson ? JSON.stringify(valueJson) : null, context.actorUserId, now, nextVersion, key);
  }
  db.prepare(`
    INSERT INTO runtime_flag_audit_logs (
      id, flag_key, old_enabled, new_enabled, old_value_json, new_value_json, changed_by_user_id, changed_by_email, reason, source, request_id, ip_address, user_agent, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    key,
    before ? (before.enabled ? 1 : 0) : null,
    enabled ? 1 : 0,
    before?.valueJson ? JSON.stringify(before.valueJson) : null,
    valueJson ? JSON.stringify(valueJson) : null,
    context.actorUserId,
    context.actorEmail,
    context.reason ?? null,
    context.source,
    context.requestId ?? null,
    context.ipAddress ?? null,
    context.userAgent ?? null,
    now,
  );
  db.prepare(`
    INSERT INTO runtime_flag_events (id, flag_key, event_type, payload_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    key,
    before ? "updated" : "created",
    JSON.stringify({ enabled, version: nextVersion, actorUserId: context.actorUserId, source: context.source }),
    now,
  );
  return getRuntimeFlagRecord(key);
}

export function listRuntimeFlagAuditLogs(limit = 100) {
  const db = getDb();
  return db.prepare("SELECT * FROM runtime_flag_audit_logs ORDER BY created_at DESC LIMIT ?").all(limit) as Array<Record<string, unknown>>;
}
