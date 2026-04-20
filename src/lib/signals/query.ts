import { resolveEntitlements, type Viewer } from "@/lib/entitlements";
import { getDb, parseJson } from "@/lib/db";
import { getSignalsSnapshot, getSignalDetail } from "@/lib/signals/signal-engine";
import { persistProductSignal, toProductSignal } from "@/lib/signals/publishing-rules";
import type { Freshness, SourceState } from "@/lib/freshness";

type SignalQueryInput = {
  viewer: Viewer | null;
  market?: string | null;
  limit?: number;
  search?: string | null;
};

type CachedSignal = {
  id: string;
  symbol: string;
  market: string;
  direction: string;
  type: string;
  confidence: number;
  entry: number;
  stop: number;
  target: number;
  expectedR: number;
  freshness: Freshness;
  sourceState: SourceState;
  publishedAt: string;
  updatedAt: string;
  thesis: string | null;
  rationale: string[];
  supportingFactors: string[];
  invalidationRules: string[];
  lifecycleState: string;
  liveEligible: boolean;
  labels: string[];
};

function mapCachedRow(row: Record<string, unknown>): CachedSignal {
  const meta = parseJson<{ labels?: string[]; liveEligible?: boolean }>(row.meta_json, {});
  return {
    id: String(row.id),
    symbol: String(row.symbol),
    market: String(row.market),
    direction: String(row.direction),
    type: String(row.class),
    confidence: Number(row.confidence),
    entry: Number(row.entry_value),
    stop: Number(row.stop_value),
    target: Number(row.target_value),
    expectedR: Number(row.expected_r),
    freshness: String(row.freshness) as Freshness,
    sourceState: String(row.source_state) as SourceState,
    publishedAt: String(row.published_at),
    updatedAt: String(row.updated_at),
    thesis: row.thesis ? String(row.thesis) : null,
    rationale: parseJson<string[]>(row.rationale_json, []),
    supportingFactors: parseJson<string[]>(row.supporting_factors_json, []),
    invalidationRules: parseJson<string[]>(row.invalidation_rules_json, []),
    lifecycleState: String(row.lifecycle_state),
    liveEligible: Boolean(meta.liveEligible),
    labels: meta.labels ?? [],
  };
}

function readCachedSignals(input: SignalQueryInput): CachedSignal[] {
  const db = getDb();
  const where: string[] = [];
  const params: unknown[] = [];
  if (input.market) {
    where.push("market = ?");
    params.push(input.market);
  }
  if (input.search) {
    where.push("symbol LIKE ?");
    params.push(`%${input.search.toUpperCase()}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const limit = input.limit ?? 100;
  const rows = db.prepare(`
    SELECT * FROM signal_records
    ${whereSql}
    ORDER BY published_at DESC
    LIMIT ?
  `).all(...params, limit) as Array<Record<string, unknown>>;

  return rows.map(mapCachedRow);
}

async function ensureSignalCache(input: SignalQueryInput) {
  // DB is the source of truth — the signal engine writes directly to signal_records on every
  // publish cycle. Reading from DB here is always fresh; no engine sync needed.
  const cached = readCachedSignals(input);
  if (cached.length > 0) return cached;

  // DB is empty (fresh install or cleared): seed it from the engine's in-memory state.
  const raw = await getSignalsSnapshot(
    input.market === "crypto" || input.market === "us" || input.market === "india" ? input.market : undefined,
  );
  const mapped = raw
    .map(toProductSignal)
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  for (const signal of mapped) {
    persistProductSignal(signal);
  }

  return readCachedSignals(input);
}

export async function getSignalsProductSnapshot(input: SignalQueryInput) {
  const entitlements = resolveEntitlements(input.viewer);
  const mapped = (await ensureSignalCache(input))
    .filter((item) => {
      if (!entitlements.canViewLiveSignals && item.freshness === "LIVE") return false;
      if (!entitlements.canViewDelayedSignals) return false;
      if (input.search && !item.symbol.includes(input.search.toUpperCase())) return false;
      return true;
    })
    .slice(0, input.limit ?? (entitlements.canViewFullHistory ? 100 : 20));

  for (const signal of mapped) {
    persistProductSignal(signal);
  }

  const visible = entitlements.isPremium ? mapped : mapped.filter((item) => item.freshness !== "LIVE");

  return {
    data: visible.map((signal) => ({
      ...signal,
      thesis: entitlements.isPremium ? signal.thesis : null,
      rationale: entitlements.isPremium ? signal.rationale : signal.rationale.slice(0, 1),
      supportingFactors: entitlements.isPremium ? signal.supportingFactors : signal.supportingFactors.slice(0, 1),
      invalidationRules: entitlements.isPremium ? signal.invalidationRules : [],
      locked: !entitlements.isPremium && signal.liveEligible,
    })),
    meta: {
      total: visible.length,
      freshnessSummary: visible.reduce<Record<string, number>>((acc, signal) => {
        acc[signal.freshness] = (acc[signal.freshness] ?? 0) + 1;
        return acc;
      }, {}),
      entitlements,
    },
  };
}

