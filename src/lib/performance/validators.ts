import type { PerformanceExclusion, PerformanceRecord, PerformanceSource } from "./types";

type RawPerformanceRow = Record<string, unknown>;

function asNumber(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function asTimestamp(value: unknown) {
  const timestamp = new Date(String(value ?? "")).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function normalizeMarket(value: unknown) {
  const market = String(value ?? "").toUpperCase();
  if (market === "CRYPTO" || market === "US" || market === "INDIA") return market;
  return null;
}

function normalizeClass(value: unknown) {
  const signalClass = String(value ?? "").toUpperCase();
  if (signalClass === "ELITE" || signalClass === "STRONG" || signalClass === "WATCHLIST") return signalClass;
  return null;
}

function normalizeDirection(value: unknown) {
  const direction = String(value ?? "").toUpperCase();
  if (direction === "LONG" || direction === "SHORT") return direction;
  return null;
}

export function normalizePerformanceSource(sourceRaw: string): {
  source: PerformanceSource;
  label: "Live Engine" | "Synced Snapshot" | "Delayed Feed";
} {
  if (sourceRaw === "LIVE_PROVIDER") return { source: "LIVE", label: "Live Engine" };
  if (sourceRaw === "DELAYED_FEED") return { source: "DELAYED", label: "Delayed Feed" };
  return { source: "SNAPSHOT", label: "Synced Snapshot" };
}

export function validateClosedPerformanceRow(row: RawPerformanceRow): { trade: PerformanceRecord | null; exclusion?: PerformanceExclusion } {
  const lifecycleState = String(row.lifecycle_state ?? "");
  if (!["closed_tp", "closed_sl", "closed_timeout"].includes(lifecycleState)) {
    return {
      trade: null,
      exclusion: { id: String(row.id ?? ""), reason: "NON_FINALIZED_LIFECYCLE", sourceRaw: String(row.source_state ?? "UNKNOWN") },
    };
  }

  const market = normalizeMarket(row.market);
  if (!market) {
    return {
      trade: null,
      exclusion: { id: String(row.id ?? ""), reason: "INVALID_MARKET", sourceRaw: String(row.source_state ?? "UNKNOWN") },
    };
  }

  const signalClass = normalizeClass(row.class);
  if (!signalClass) {
    return {
      trade: null,
      exclusion: { id: String(row.id ?? ""), reason: "INVALID_CLASS", sourceRaw: String(row.source_state ?? "UNKNOWN") },
    };
  }

  const direction = normalizeDirection(row.direction);
  if (!direction) {
    return {
      trade: null,
      exclusion: { id: String(row.id ?? ""), reason: "INVALID_DIRECTION", sourceRaw: String(row.source_state ?? "UNKNOWN") },
    };
  }

  const confidence = asNumber(row.confidence);
  if (confidence === null || confidence < 0 || confidence > 100) {
    return {
      trade: null,
      exclusion: { id: String(row.id ?? ""), reason: "INVALID_CONFIDENCE", sourceRaw: String(row.source_state ?? "UNKNOWN") },
    };
  }

  const entry = asNumber(row.entry_value);
  const stop = asNumber(row.stop_value);
  const target = asNumber(row.target_value);
  const expectedR = asNumber(row.expected_r);
  if ([entry, stop, target, expectedR].some((value) => value === null)) {
    return {
      trade: null,
      exclusion: { id: String(row.id ?? ""), reason: "MISSING_TRADE_PLAN", sourceRaw: String(row.source_state ?? "UNKNOWN") },
    };
  }

  const openedAt = asTimestamp(row.published_at);
  const closedAt = asTimestamp(row.updated_at);
  if (openedAt === null || closedAt === null || closedAt < openedAt) {
    return {
      trade: null,
      exclusion: { id: String(row.id ?? ""), reason: "INVALID_TIMESTAMPS", sourceRaw: String(row.source_state ?? "UNKNOWN") },
    };
  }

  const normalizedSource = normalizePerformanceSource(String(row.source_state ?? "SNAPSHOT"));
  const outcome = lifecycleState === "closed_tp" ? "TP" : lifecycleState === "closed_sl" ? "SL" : "TIMEOUT";
  const entryValue = entry!;
  const stopValue = stop!;
  const targetValue = target!;
  const expectedRValue = expectedR!;
  const r = outcome === "TP" ? expectedRValue : outcome === "SL" ? -1 : 0;
  if (!Number.isFinite(r)) {
    return {
      trade: null,
      exclusion: { id: String(row.id ?? ""), reason: "INVALID_R_MULTIPLE", sourceRaw: String(row.source_state ?? "UNKNOWN") },
    };
  }

  const exit = outcome === "TP" ? targetValue : outcome === "SL" ? stopValue : entryValue;
  const resultPctRaw = direction === "LONG"
    ? ((exit - entryValue) / entryValue) * 100
    : ((entryValue - exit) / entryValue) * 100;

  return {
    trade: {
      id: String(row.id),
      signalId: String(row.id),
      symbol: String(row.symbol ?? "UNKNOWN"),
      market,
      direction,
      signalClass,
      confidence,
      entry: entryValue,
      stop: stopValue,
      target: targetValue,
      expectedR: expectedRValue,
      source: normalizedSource.source,
      sourceRaw: String(row.source_state ?? "UNKNOWN"),
      sourceLabel: normalizedSource.label,
      openedAt,
      closedAt,
      updatedAt: closedAt,
      ingestionAt: openedAt,
      outcome,
      r,
      exit,
      resultPct: Number(resultPctRaw.toFixed(4)),
      timeHeldMs: closedAt - openedAt,
    },
  };
}
