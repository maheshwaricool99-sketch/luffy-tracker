import { getDb, parseJson } from "@/lib/db";

export async function getSignalEvents(signalId: string) {
  const rows = getDb().prepare(`
    SELECT * FROM signal_events
    WHERE signal_id = ?
    ORDER BY event_at DESC
    LIMIT 100
  `).all(signalId) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    id: String(row.id),
    eventType: String(row.event_type),
    eventAt: String(row.event_at),
    payload: parseJson<Record<string, unknown>>(row.payload_json, {}),
    actorType: String(row.actor_type),
    actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
  }));
}
