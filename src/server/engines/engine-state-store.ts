import { getDb, nowIso, parseJson } from "@/lib/db";

export type EngineStateRow = {
  engine: string;
  status: string;
  mode: string | null;
  reasonCode: string | null;
  reason: string | null;
  lastHeartbeatAt: string | null;
  lastHealthyAt: string | null;
  lastRestartAt: string | null;
  lastRestartBy: string | null;
  lastConfigChangeAt: string | null;
  lastConfigChangeBy: string | null;
  metadata: Record<string, unknown>;
  updatedAt: string;
};

export function readEngineState(engine: string): EngineStateRow | null {
  const row = getDb().prepare("SELECT * FROM engine_runtime_state WHERE engine = ?").get(engine) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    engine: String(row.engine),
    status: String(row.status),
    mode: row.mode ? String(row.mode) : null,
    reasonCode: row.reason_code ? String(row.reason_code) : null,
    reason: row.reason ? String(row.reason) : null,
    lastHeartbeatAt: row.last_heartbeat_at ? String(row.last_heartbeat_at) : null,
    lastHealthyAt: row.last_healthy_at ? String(row.last_healthy_at) : null,
    lastRestartAt: row.last_restart_at ? String(row.last_restart_at) : null,
    lastRestartBy: row.last_restart_by ? String(row.last_restart_by) : null,
    lastConfigChangeAt: row.last_config_change_at ? String(row.last_config_change_at) : null,
    lastConfigChangeBy: row.last_config_change_by ? String(row.last_config_change_by) : null,
    metadata: parseJson<Record<string, unknown>>(row.metadata_json, {}),
    updatedAt: String(row.updated_at),
  };
}

export type EngineStatePatch = Partial<Omit<EngineStateRow, "engine" | "updatedAt">>;

export function writeEngineState(engine: string, patch: EngineStatePatch) {
  const existing = readEngineState(engine);
  const merged: EngineStateRow = {
    engine,
    status: patch.status ?? existing?.status ?? "starting",
    mode: patch.mode ?? existing?.mode ?? null,
    reasonCode: patch.reasonCode ?? existing?.reasonCode ?? null,
    reason: patch.reason ?? existing?.reason ?? null,
    lastHeartbeatAt: patch.lastHeartbeatAt ?? existing?.lastHeartbeatAt ?? null,
    lastHealthyAt: patch.lastHealthyAt ?? existing?.lastHealthyAt ?? null,
    lastRestartAt: patch.lastRestartAt ?? existing?.lastRestartAt ?? null,
    lastRestartBy: patch.lastRestartBy ?? existing?.lastRestartBy ?? null,
    lastConfigChangeAt: patch.lastConfigChangeAt ?? existing?.lastConfigChangeAt ?? null,
    lastConfigChangeBy: patch.lastConfigChangeBy ?? existing?.lastConfigChangeBy ?? null,
    metadata: patch.metadata ?? existing?.metadata ?? {},
    updatedAt: nowIso(),
  };
  getDb().prepare(`
    INSERT INTO engine_runtime_state (
      engine, status, mode, reason_code, reason,
      last_heartbeat_at, last_healthy_at, last_restart_at, last_restart_by,
      last_config_change_at, last_config_change_by, metadata_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(engine) DO UPDATE SET
      status = excluded.status,
      mode = excluded.mode,
      reason_code = excluded.reason_code,
      reason = excluded.reason,
      last_heartbeat_at = excluded.last_heartbeat_at,
      last_healthy_at = excluded.last_healthy_at,
      last_restart_at = excluded.last_restart_at,
      last_restart_by = excluded.last_restart_by,
      last_config_change_at = excluded.last_config_change_at,
      last_config_change_by = excluded.last_config_change_by,
      metadata_json = excluded.metadata_json,
      updated_at = excluded.updated_at
  `).run(
    merged.engine,
    merged.status,
    merged.mode,
    merged.reasonCode,
    merged.reason,
    merged.lastHeartbeatAt,
    merged.lastHealthyAt,
    merged.lastRestartAt,
    merged.lastRestartBy,
    merged.lastConfigChangeAt,
    merged.lastConfigChangeBy,
    JSON.stringify(merged.metadata ?? {}),
    merged.updatedAt,
  );
  return merged;
}
