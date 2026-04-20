import { getDb } from "@/lib/db";
import { assertWritableOrThrow, runtimeConfig } from "@/lib/runtime";

export async function removeWatchlistItem(userId: string, signalId: string) {
  assertWritableOrThrow((await runtimeConfig.getAll()).flags);
  getDb().prepare("DELETE FROM signal_watchlist_items WHERE user_id = ? AND signal_id = ?").run(userId, signalId);
  return { ok: true, watchlisted: false, signalId };
}
