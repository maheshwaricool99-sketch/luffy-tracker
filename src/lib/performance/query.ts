import { getDb } from "@/lib/db";
import type { Viewer } from "@/lib/entitlements";
import { CACHE_TTL_SEC_BY_ROLE, CONFIDENCE_BUCKETS, DEFAULT_FILTERS, MAX_PAGE_SIZE_BY_ROLE, PAGE_SIZE_BY_ROLE, RANGE_TO_DAYS } from "./constants";
import { buildBreakdowns, buildEquityCurve, buildSummary } from "./aggregators";
import { getPerformanceCache, setPerformanceCache } from "./cache";
import { serializePerformanceByRole } from "./serializers";
import { normalizePerformanceSource, validateClosedPerformanceRow } from "./validators";
import type {
  PerformanceApiResponse,
  PerformanceConfidenceBucketKey,
  PerformanceDataState,
  PerformanceFilters,
  PerformanceRange,
  PerformanceRecord,
  PerformanceRole,
  PerformanceSourceMeta,
} from "./types";

function resolveRole(viewer: Viewer | null): PerformanceRole {
  if (!viewer) return "GUEST";
  if (viewer.role === "ADMIN" || viewer.role === "SUPERADMIN") return "ADMIN";
  if (viewer.subscription?.plan === "PREMIUM") return "PREMIUM";
  return "FREE";
}

function parseSearchParams(input: URLSearchParams | Record<string, string | string[] | undefined> | undefined, role: PerformanceRole): PerformanceFilters {
  const getValue = (key: string) => {
    if (!input) return null;
    if (input instanceof URLSearchParams) return input.get(key);
    const value = input[key];
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
  };

  const market = getValue("market");
  const signalClass = getValue("class");
  const confidenceBucket = getValue("confidenceBucket");
  const range = getValue("range");
  const source = getValue("source");
  const includeAdmin = getValue("includeAdmin") === "true";
  const refresh = getValue("refresh") === "1";
  const page = Math.max(1, Number(getValue("page") ?? DEFAULT_FILTERS.page) || DEFAULT_FILTERS.page);
  const pageSizeInput = Math.max(1, Number(getValue("pageSize") ?? DEFAULT_FILTERS.pageSize) || DEFAULT_FILTERS.pageSize);
  const maxPageSize = MAX_PAGE_SIZE_BY_ROLE[role];
  const defaultPageSize = role === "GUEST" || role === "FREE" ? PAGE_SIZE_BY_ROLE[role] : pageSizeInput;

  return {
    market: market === "crypto" || market === "us" || market === "india" ? market : DEFAULT_FILTERS.market,
    class: signalClass === "elite" || signalClass === "strong" || signalClass === "watchlist" ? signalClass : DEFAULT_FILTERS.class,
    confidenceBucket: confidenceBucket === "90plus" || confidenceBucket === "80to89" || confidenceBucket === "70to79" || confidenceBucket === "lt70"
      ? confidenceBucket as PerformanceConfidenceBucketKey
      : DEFAULT_FILTERS.confidenceBucket,
    range: range === "7d" || range === "30d" || range === "90d" || range === "all" ? range as PerformanceRange : DEFAULT_FILTERS.range,
    source: source === "live" || source === "snapshot" || source === "delayed" ? source : DEFAULT_FILTERS.source,
    page,
    pageSize: Math.min(defaultPageSize, maxPageSize),
    includeAdmin,
    refresh,
  };
}

function getRangeStart(range: PerformanceRange) {
  const days = RANGE_TO_DAYS[range];
  if (days === null) return null;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function applyFilters(records: PerformanceRecord[], filters: PerformanceFilters) {
  const rangeStart = getRangeStart(filters.range);
  const confidenceBucket = CONFIDENCE_BUCKETS.find((bucket) => bucket.key === filters.confidenceBucket);
  return records.filter((record) => {
    if (filters.market !== "all" && record.market.toLowerCase() !== filters.market) return false;
    if (filters.class !== "all" && record.signalClass.toLowerCase() !== filters.class) return false;
    if (filters.source !== "all" && record.source.toLowerCase() !== filters.source) return false;
    if (rangeStart !== null && record.closedAt < rangeStart) return false;
    if (confidenceBucket && (record.confidence < confidenceBucket.min || record.confidence > confidenceBucket.max)) return false;
    return true;
  });
}

function applyOpenFilters(rows: Array<Record<string, unknown>>, filters: PerformanceFilters) {
  const rangeStart = getRangeStart(filters.range);
  const confidenceBucket = CONFIDENCE_BUCKETS.find((bucket) => bucket.key === filters.confidenceBucket);
  return rows.filter((row) => {
    const market = String(row.market ?? "").toLowerCase();
    const signalClass = String(row.class ?? "").toLowerCase();
    const confidence = Number(row.confidence ?? NaN);
    const source = normalizePerformanceSource(String(row.source_state ?? "SNAPSHOT")).source.toLowerCase();
    const openedAt = new Date(String(row.published_at ?? "")).getTime();
    if (filters.market !== "all" && market !== filters.market) return false;
    if (filters.class !== "all" && signalClass !== filters.class) return false;
    if (filters.source !== "all" && source !== filters.source) return false;
    if (rangeStart !== null && Number.isFinite(openedAt) && openedAt < rangeStart) return false;
    if (confidenceBucket && (confidence < confidenceBucket.min || confidence > confidenceBucket.max)) return false;
    return true;
  });
}

function buildCacheKey(role: PerformanceRole, filters: PerformanceFilters) {
  return `perf:v1:role:${role.toLowerCase()}:market:${filters.market}:class:${filters.class}:bucket:${filters.confidenceBucket}:range:${filters.range}:source:${filters.source}:page:${filters.page}:size:${filters.pageSize}:admin:${filters.includeAdmin ? 1 : 0}`;
}

function computeSourceMeta(records: PerformanceRecord[]): { source: PerformanceSourceMeta; dataState: PerformanceDataState; statusLabel: PerformanceApiResponse["meta"]["statusLabel"] } {
  if (records.length === 0) {
    return { source: "SNAPSHOT", dataState: "EMPTY", statusLabel: "No Data" };
  }

  const uniqueSources = [...new Set(records.map((record) => record.source))];
  if (uniqueSources.length > 1) {
    return { source: "MIXED", dataState: "PARTIAL", statusLabel: "Mixed Sources" };
  }

  const [source] = uniqueSources;
  if (source === "LIVE") return { source, dataState: "LIVE", statusLabel: "Live Engine" };
  if (source === "DELAYED") return { source, dataState: "DELAYED", statusLabel: "Delayed Feed" };
  return { source, dataState: "DELAYED", statusLabel: "Synced Snapshot" };
}

function buildWindow(records: PerformanceRecord[], start: number, end: number) {
  return records.filter((record) => record.closedAt >= start && record.closedAt < end);
}

export async function getPerformancePayload(viewer: Viewer | null, input?: URLSearchParams | Record<string, string | string[] | undefined>) {
  const role = resolveRole(viewer);
  const filters = parseSearchParams(input, role);
  const cacheKey = buildCacheKey(role, filters);
  const ttlSec = CACHE_TTL_SEC_BY_ROLE[role];

  if (!filters.refresh) {
    const cached = getPerformanceCache(cacheKey);
    if (cached) {
      return {
        ...cached.payload,
        meta: {
          ...cached.payload.meta,
          cache: {
            ...cached.payload.meta.cache,
            hit: true,
          },
        },
      };
    }
  }

  const db = getDb();
  const closedRows = db.prepare(`
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
      expected_r,
      source_state,
      published_at,
      updated_at,
      lifecycle_state
    FROM signal_records
    WHERE lifecycle_state IN ('closed_tp', 'closed_sl', 'closed_timeout')
    ORDER BY updated_at DESC
  `).all() as Array<Record<string, unknown>>;

  const openRows = db.prepare(`
    SELECT
      id,
      market,
      class,
      confidence,
      source_state,
      published_at,
      lifecycle_state
    FROM signal_records
    WHERE lifecycle_state IN ('published', 'triggered', 'open')
  `).all() as Array<Record<string, unknown>>;

  const eligibleTrades: PerformanceRecord[] = [];
  const exclusions: Array<{ id: string; reason: string; sourceRaw: string }> = [];

  for (const row of closedRows) {
    const result = validateClosedPerformanceRow(row);
    if (result.trade) eligibleTrades.push(result.trade);
    if (result.exclusion) exclusions.push(result.exclusion);
  }

  const filteredTrades = applyFilters(eligibleTrades, filters).sort((a, b) => a.closedAt - b.closedAt);
  const pagedTrades = [...filteredTrades].sort((a, b) => b.closedAt - a.closedAt);
  const activeTrades = applyOpenFilters(openRows, filters).length;

  const now = Date.now();
  const current7dStart = now - 7 * 24 * 60 * 60 * 1000;
  const previous7dStart = now - 14 * 24 * 60 * 60 * 1000;
  const current7d = buildWindow(filteredTrades, current7dStart, now);
  const previous7d = buildWindow(filteredTrades, previous7dStart, current7dStart);

  const sourceMeta = computeSourceMeta(filteredTrades);
  const lastUpdated = filteredTrades.length > 0 ? Math.max(...filteredTrades.map((trade) => trade.updatedAt)) : null;
  const delayedByMs = lastUpdated === null || sourceMeta.source === "LIVE" ? null : Math.max(0, Date.now() - lastUpdated);
  const totalTrades = pagedTrades.length;
  const totalPages = Math.max(1, Math.ceil(totalTrades / filters.pageSize));
  const startIndex = (filters.page - 1) * filters.pageSize;
  const tradesPage = pagedTrades.slice(startIndex, startIndex + filters.pageSize);

  const payload: PerformanceApiResponse = {
    summary: buildSummary(filteredTrades, activeTrades, previous7d, current7d),
    equityCurve: buildEquityCurve(filteredTrades),
    breakdown: buildBreakdowns(filteredTrades),
    trades: tradesPage.map((trade) => ({
      id: trade.id,
      signalId: trade.signalId,
      symbol: trade.symbol,
      market: trade.market,
      direction: trade.direction,
      entry: trade.entry,
      exit: trade.exit,
      resultPct: trade.resultPct,
      r: trade.r,
      confidence: trade.confidence,
      timeHeldMs: trade.timeHeldMs,
      outcome: trade.outcome,
      source: trade.source,
      closedAt: trade.closedAt,
      openedAt: trade.openedAt,
      signalClass: trade.signalClass,
      sourceLabel: trade.sourceLabel,
      updatedAt: trade.updatedAt,
      ingestionAt: trade.ingestionAt,
    })),
    meta: {
      role,
      source: sourceMeta.source,
      lastUpdated,
      delayedByMs,
      dataState: filteredTrades.length === 0 && activeTrades > 0 ? "EMPTY" : sourceMeta.dataState,
      cache: {
        hit: false,
        key: cacheKey,
        generatedAt: Date.now(),
        ttlSec,
      },
      filters: {
        market: filters.market,
        class: filters.class,
        confidenceBucket: filters.confidenceBucket,
        range: filters.range,
        source: filters.source,
        page: filters.page,
        pageSize: filters.pageSize,
      },
      totalTrades,
      totalPages,
      canUseFilters: role === "PREMIUM" || role === "ADMIN",
      locked: {
        metrics: role === "GUEST",
        equityCurve: role === "GUEST" || role === "FREE",
        byConfidence: role === "GUEST",
        byClass: role === "GUEST" || role === "FREE",
        expectancy: role !== "PREMIUM" && role !== "ADMIN",
        advancedFilters: role !== "PREMIUM" && role !== "ADMIN",
        export: role !== "PREMIUM" && role !== "ADMIN",
      },
      statusLabel: sourceMeta.statusLabel,
    },
    admin: role === "ADMIN" && filters.includeAdmin ? {
      excludedTradeCount: exclusions.length,
      exclusionReasons: exclusions.reduce<Record<string, number>>((acc, item) => {
        acc[item.reason] = (acc[item.reason] ?? 0) + 1;
        return acc;
      }, {}),
      rawSourceBreakdown: eligibleTrades.reduce<Array<{ source: string; count: number }>>((acc, trade) => {
        const found = acc.find((item) => item.source === trade.sourceRaw);
        if (found) found.count += 1;
        else acc.push({ source: trade.sourceRaw, count: 1 });
        return acc;
      }, []),
      provenance: {
        sourceTable: "signal_records",
        closedAtField: "updated_at",
        openedAtField: "published_at",
        exitComputation: "Derived from stored target/stop plan for finalized outcomes; timeout exits fall back to entry.",
      },
    } : undefined,
  };

  const serialized = serializePerformanceByRole(payload, role);
  const generatedAt = setPerformanceCache(cacheKey, serialized, ttlSec);
  return {
    ...serialized,
    meta: {
      ...serialized.meta,
      cache: {
        ...serialized.meta.cache,
        generatedAt,
      },
    },
  };
}
