import { randomUUID } from "node:crypto";
import { getDb, nowIso, parseJson } from "@/lib/db";
import { resolveEntitlements, type Viewer } from "@/lib/entitlements";
import { getUserAlertCount, getUserWatchlistCount } from "@/lib/auth";

export function getUserWatchlists(viewer: Viewer) {
  const rows = getDb().prepare("SELECT * FROM watchlists WHERE user_id = ? ORDER BY updated_at DESC").all(viewer.id) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    symbols: parseJson<string[]>(row.symbols_json, []),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export function createWatchlist(viewer: Viewer, input: { name: string; symbols: string[] }) {
  const entitlements = resolveEntitlements(viewer);
  if (getUserWatchlistCount(viewer.id) >= entitlements.maxWatchlists) {
    throw new Error("Watchlist limit reached for current plan");
  }
  const now = nowIso();
  getDb().prepare(`
    INSERT INTO watchlists (id, user_id, name, symbols_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), viewer.id, input.name, JSON.stringify(input.symbols.slice(0, entitlements.isPremium ? 100 : 25)), now, now);
}

export function updateWatchlist(viewer: Viewer, id: string, input: { name?: string; symbols?: string[] }) {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM watchlists WHERE id = ? AND user_id = ?").get(id, viewer.id) as { id?: string } | undefined;
  if (!existing?.id) throw new Error("Watchlist not found");
  const current = db.prepare("SELECT * FROM watchlists WHERE id = ?").get(id) as Record<string, unknown>;
  db.prepare(`
    UPDATE watchlists
    SET name = ?, symbols_json = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    input.name ?? String(current.name),
    JSON.stringify(input.symbols ?? parseJson<string[]>(current.symbols_json, [])),
    nowIso(),
    id,
    viewer.id,
  );
}

export function deleteWatchlist(viewer: Viewer, id: string) {
  getDb().prepare("DELETE FROM watchlists WHERE id = ? AND user_id = ?").run(id, viewer.id);
}

export function getUserAlerts(viewer: Viewer) {
  const rows = getDb().prepare("SELECT * FROM alerts WHERE user_id = ? ORDER BY updated_at DESC").all(viewer.id) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    symbol: row.symbol ? String(row.symbol) : null,
    type: String(row.type),
    config: parseJson<Record<string, unknown>>(row.config_json, {}),
    enabled: Boolean(row.enabled),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export function createAlert(viewer: Viewer, input: { symbol?: string | null; type: string; config: Record<string, unknown> }) {
  const entitlements = resolveEntitlements(viewer);
  if (getUserAlertCount(viewer.id) >= entitlements.maxAlerts) {
    throw new Error("Alert limit reached for current plan");
  }
  const now = nowIso();
  getDb().prepare(`
    INSERT INTO alerts (id, user_id, symbol, type, config_json, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).run(randomUUID(), viewer.id, input.symbol ?? null, input.type, JSON.stringify(input.config), now, now);
}

export function updateAlert(viewer: Viewer, id: string, input: { enabled?: boolean; config?: Record<string, unknown> }) {
  const db = getDb();
  const current = db.prepare("SELECT * FROM alerts WHERE id = ? AND user_id = ?").get(id, viewer.id) as Record<string, unknown> | undefined;
  if (!current) throw new Error("Alert not found");
  db.prepare(`
    UPDATE alerts
    SET enabled = ?, config_json = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    input.enabled ?? Boolean(current.enabled) ? 1 : 0,
    JSON.stringify(input.config ?? parseJson<Record<string, unknown>>(current.config_json, {})),
    nowIso(),
    id,
    viewer.id,
  );
}

export function deleteAlert(viewer: Viewer, id: string) {
  getDb().prepare("DELETE FROM alerts WHERE id = ? AND user_id = ?").run(id, viewer.id);
}

export function getUserSettings(viewer: Viewer) {
  const row = getDb().prepare("SELECT * FROM user_settings WHERE user_id = ?").get(viewer.id) as Record<string, unknown> | undefined;
  return {
    profile: parseJson<Record<string, unknown>>(row?.profile_json, {}),
    notifications: parseJson<Record<string, unknown>>(row?.notifications_json, {}),
  };
}

export function updateUserSettings(viewer: Viewer, input: { profile?: Record<string, unknown>; notifications?: Record<string, unknown> }) {
  const current = getUserSettings(viewer);
  getDb().prepare(`
    INSERT INTO user_settings (user_id, notifications_json, profile_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      notifications_json = excluded.notifications_json,
      profile_json = excluded.profile_json,
      updated_at = excluded.updated_at
  `).run(
    viewer.id,
    JSON.stringify({ ...current.notifications, ...input.notifications }),
    JSON.stringify({ ...current.profile, ...input.profile }),
    nowIso(),
    nowIso(),
  );
}
