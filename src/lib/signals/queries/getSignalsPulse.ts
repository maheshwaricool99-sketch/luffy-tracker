import { getDb } from "@/lib/db";
import type { AppRole } from "../types/signalEnums";
import { serializeSignalsPulseByRole } from "../serializers/serializeSignalsPulseByRole";

export async function getSignalsPulse(role: AppRole) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT market, confidence, freshness, published_at, lifecycle_state, symbol
    FROM signal_records
    ORDER BY published_at DESC
    LIMIT 500
  `).all() as Array<Record<string, unknown>>;
  const visible = role === "GUEST" || role === "FREE" ? rows.filter((row) => String(row.freshness) !== "LIVE") : rows;
  const last = visible[0];
  const total = visible.length;
  const crypto = visible.filter((row) => String(row.market) === "crypto").length;
  const us = visible.filter((row) => String(row.market) === "us").length;
  const india = visible.filter((row) => String(row.market) === "india").length;
  const avg = visible.length > 0 ? Math.round(visible.reduce((acc, row) => acc + Number(row.confidence ?? 0), 0) / visible.length) : 0;
  const bullish = visible.filter((row) => Number(row.entry_value ?? 0) >= Number(row.stop_value ?? 0)).length;
  const bearish = Math.max(0, visible.length - bullish);
  const closed = visible.filter((row) => ["closed_tp", "closed_sl"].includes(String(row.lifecycle_state ?? "")));
  const wins = closed.filter((row) => String(row.lifecycle_state) === "closed_tp").length;
  const winRate30d = closed.length ? Number(((wins / closed.length) * 100).toFixed(1)) : null;

  return serializeSignalsPulseByRole({
    role,
    activeSignals: visible.filter((row) => ["published", "triggered", "open"].includes(String(row.lifecycle_state ?? ""))).length,
    averageConfidence: avg,
    total,
    crypto,
    us,
    india,
    lastSignal: {
      symbol: last ? String(last.symbol) : null,
      market: last ? (String(last.market) === "crypto" ? "CRYPTO" : String(last.market) === "us" ? "US" : "INDIA") : null,
      publishedAt: last ? String(last.published_at) : null,
      freshnessBadge: last ? (String(last.freshness) === "LIVE" ? "FRESH" : String(last.freshness) === "DELAYED" ? "AGING" : "STALE") : null,
    },
    bullishPct: total ? Math.round((bullish / total) * 100) : 0,
    neutralPct: total ? Math.round((Math.max(0, total - bullish - bearish) / total) * 100) : 0,
    bearishPct: total ? Math.round((bearish / total) * 100) : 0,
    winRate30d,
  });
}
