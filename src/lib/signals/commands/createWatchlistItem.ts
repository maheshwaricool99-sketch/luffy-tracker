import { randomUUID } from "node:crypto";
import { getDb, nowIso } from "@/lib/db";
import { assertWritableOrThrow, runtimeConfig } from "@/lib/runtime";

export async function createWatchlistItem(userId: string, signalId: string) {
  assertWritableOrThrow((await runtimeConfig.getAll()).flags);
  getDb().prepare(`
    INSERT INTO signal_watchlist_items (id, user_id, signal_id, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, signal_id) DO NOTHING
  `).run(randomUUID(), userId, signalId, nowIso());
  return { ok: true, watchlisted: true, signalId };
}
