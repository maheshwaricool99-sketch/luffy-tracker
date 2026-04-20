import { getDb } from "@/lib/db";
import { decodeCursor, encodeCursor } from "@/lib/utils/pagination";
import type { SignalListFilters } from "../types/signalFilters";
import type { AppRole } from "../types/signalEnums";
import { serializeSignalForAdmin } from "../serializers/serializeSignalForAdmin";
import { serializeSignalForFree } from "../serializers/serializeSignalForFree";
import { serializeSignalForGuest } from "../serializers/serializeSignalForGuest";
import { serializeSignalForPremium } from "../serializers/serializeSignalForPremium";
import type { SignalRecordRow } from "../serializers/base";

export async function listSignals(filters: SignalListFilters, role: AppRole, userId?: string | null) {
  const db = getDb();
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.market) {
    where.push("lower(market) = lower(?)");
    params.push(filters.market.toLowerCase());
  }
  if (filters.query) {
    where.push("(upper(symbol) LIKE ? OR upper(id) LIKE ?)");
    const q = `%${filters.query.toUpperCase()}%`;
    params.push(q, q);
  }
  if (filters.confidenceMin) {
    where.push("confidence >= ?");
    params.push(filters.confidenceMin);
  }
  if (role === "GUEST" || role === "FREE") {
    where.push("freshness != 'LIVE'");
  }
  const cursorValue = decodeCursor(filters.cursor);
  if (cursorValue) {
    where.push("published_at < ?");
    params.push(cursorValue);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const sortBy = filters.sortBy === "confidenceScore" ? "confidence" : filters.sortBy === "symbol" ? "symbol" : "published_at";
  const sortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
  const limit = Math.max(1, Math.min(filters.limit ?? 20, 100));

  const rows = db.prepare(`
    SELECT
      id,
      symbol,
      market,
      direction,
      class,
      confidence,
      entry_value,
      stop_value,
      target_value,
      freshness,
      source_state,
      published_at,
      updated_at,
      thesis,
      lifecycle_state,
      meta_json
    FROM signal_records
    ${whereSql}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ?
  `).all(...params, limit + 1) as SignalRecordRow[];

  const slice = rows.slice(0, limit);
  const watchlistedIds = userId && slice.length > 0
    ? new Set(
        (db.prepare(`
          SELECT signal_id
          FROM signal_watchlist_items
          WHERE user_id = ?
            AND signal_id IN (${slice.map(() => "?").join(",")})
        `).all(userId, ...slice.map((row) => String(row.id))) as Array<{ signal_id: string }>).map((row) => String(row.signal_id)),
      )
    : new Set<string>();

  const items = slice.map((row) => {
    const watchlisted = watchlistedIds.has(String(row.id));
    if (role === "ADMIN" || role === "SUPERADMIN") return serializeSignalForAdmin(row);
    if (role === "PREMIUM") return serializeSignalForPremium(row, { isWatchlisted: watchlisted });
    if (role === "FREE") return serializeSignalForFree(row, { isWatchlisted: watchlisted });
    return serializeSignalForGuest(row);
  });

  return {
    items,
    pageInfo: {
      nextCursor: rows.length > limit ? encodeCursor(String(slice[slice.length - 1]?.published_at ?? "")) : null,
      hasMore: rows.length > limit,
    },
  };
}
