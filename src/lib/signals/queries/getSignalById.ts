import { getDb } from "@/lib/db";
import { buildDrawerDto, type SignalRecordRow } from "../serializers/base";
import type { AppRole } from "../types/signalEnums";
import { serializeSignalForAdmin } from "../serializers/serializeSignalForAdmin";
import { serializeSignalForFree } from "../serializers/serializeSignalForFree";
import { serializeSignalForGuest } from "../serializers/serializeSignalForGuest";
import { serializeSignalForPremium } from "../serializers/serializeSignalForPremium";

export async function getSignalById(id: string, role: AppRole, userId?: string | null) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM signal_records WHERE id = ? OR symbol = ?").get(id, id) as SignalRecordRow | undefined;
  if (!row) return null;
  if ((role === "GUEST" || role === "FREE") && String(row.freshness) === "LIVE") return null;
  const watchlisted = userId
    ? Boolean(db.prepare("SELECT id FROM signal_watchlist_items WHERE user_id = ? AND signal_id = ?").get(userId, String(row.id)))
    : false;

  const listDto =
    role === "ADMIN" || role === "SUPERADMIN" ? serializeSignalForAdmin(row) :
    role === "PREMIUM" ? serializeSignalForPremium(row, { isWatchlisted: watchlisted }) :
    role === "FREE" ? serializeSignalForFree(row, { isWatchlisted: watchlisted }) :
    serializeSignalForGuest(row);

  return buildDrawerDto(row, listDto, role === "ADMIN" || role === "SUPERADMIN");
}
