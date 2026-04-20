"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import type {
  MarketBias,
  MarketSignal,
  ScannerSnapshot,
  SignalClassification,
  SignalDirection,
  SignalLogEntry,
} from "@/lib/market-snapshot/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function classColor(c: SignalClassification): string {
  switch (c) {
    case "STRONG_SIGNAL": return "text-emerald-300 font-semibold";
    case "DEVELOPING":    return "text-amber-300";
    case "EARLY":         return "text-sky-300";
    default:              return "text-[var(--text-muted)]";
  }
}

function dirColor(d: SignalDirection): string {
  if (d === "LONG")  return "text-emerald-400";
  if (d === "SHORT") return "text-rose-400";
  return "text-[var(--text-muted)]";
}

function dirBg(d: SignalDirection): string {
  if (d === "LONG")  return "bg-emerald-400/15 text-emerald-200 border-emerald-400/30";
  if (d === "SHORT") return "bg-rose-400/15 text-rose-200 border-rose-400/30";
  return "bg-white/5 text-[var(--text-muted)] border-white/10";
}

function biasColor(b: MarketBias["direction"]): string {
  if (b === "BULLISH") return "text-emerald-300";
  if (b === "BEARISH") return "text-rose-300";
  return "text-amber-300";
}

function biasBg(b: MarketBias["direction"]): string {
  if (b === "BULLISH") return "border-emerald-400/30 bg-emerald-400/10";
  if (b === "BEARISH") return "border-rose-400/30 bg-rose-400/10";
  return "border-amber-400/30 bg-amber-400/10";
}

function scoreBar(score: number): string {
  if (score >= 75) return "bg-emerald-400";
  if (score >= 60) return "bg-amber-400";
  if (score >= 45) return "bg-sky-400";
  return "bg-white/20";
}

function fmt(ms: number): string {
  if (!ms) return "—";
  const d = Math.floor((Date.now() - ms) / 1000);
  if (d < 60) return `${d}s ago`;
  return `${Math.floor(d / 60)}m ${d % 60}s ago`;
}

// ── Filter state ──────────────────────────────────────────────────────────────

type Filters = {
  minConfidence: number;
  direction: SignalDirection | "ALL";
  market: "ALL" | "crypto" | "us" | "india";
};

function applyFilters(signals: MarketSignal[], filters: Filters): MarketSignal[] {
  return signals.filter((s) => {
    if (s.decision.confidence < filters.minConfidence) return false;
    if (filters.direction !== "ALL" && s.decision.direction !== filters.direction) return false;
    if (filters.market !== "ALL" && s.marketId !== filters.market) return false;
    return true;
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-white/10">
        <div className={`h-full rounded-full ${scoreBar(score)}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs tabular-nums text-[var(--text-soft)]">{score}</span>
    </div>
  );
}

function DirectionPill({ direction }: { direction: SignalDirection }) {
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${dirBg(direction)}`}>
      {direction}
    </span>
  );
}

function ClassBadge({ c }: { c: SignalClassification }) {
  const map: Record<SignalClassification, string> = {
    STRONG_SIGNAL: "bg-emerald-400/15 text-emerald-200 border-emerald-400/30",
    DEVELOPING:    "bg-amber-400/15 text-amber-200 border-amber-400/30",
    EARLY:         "bg-sky-400/15 text-sky-200 border-sky-400/30",
    IGNORE:        "bg-white/5 text-[var(--text-muted)] border-white/10",
  };
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[c]}`}>
      {c.replace("_", " ")}
    </span>
  );
}

// ── Panel A: Top Opportunities ────────────────────────────────────────────────

function TopOpportunitiesPanel({ signals, filters }: { signals: MarketSignal[]; filters: Filters }) {
  const filtered = applyFilters(signals, filters);
  const top = filtered.filter((s) => s.classification !== "IGNORE").slice(0, 10);

  return (
    <Card title="Top Opportunities" subtitle="Highest-ranked actionable signals">
      {top.length === 0 ? (
        <p className="text-sm text-[var(--text-soft)]">No qualifying signals match current filters.</p>
      ) : (
        <div className="overflow-auto rounded-xl border border-[var(--line)]">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-white/[0.03] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              <tr>
                <th className="px-3 py-2">Symbol</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Signal</th>
                <th className="px-3 py-2">Direction</th>
                <th className="px-3 py-2">Setup</th>
                <th className="px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {top.map((s) => (
                <tr key={s.symbol} className="border-t border-[var(--line)] hover:bg-white/[0.02]">
                  <td className="px-3 py-2">
                    <div className="font-semibold text-[var(--text-strong)]">{s.symbol}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{s.marketId}</div>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-[var(--text-soft)]">
                    {s.price > 0 ? `$${s.price < 1 ? s.price.toFixed(5) : s.price < 100 ? s.price.toFixed(4) : s.price.toFixed(2)}` : "unavailable"}
                  </td>
                  <td className="px-3 py-2"><ScoreBar score={s.signalScore} /></td>
                  <td className="px-3 py-2"><ClassBadge c={s.classification} /></td>
                  <td className="px-3 py-2"><DirectionPill direction={s.decision.direction} /></td>
                  <td className="px-3 py-2 text-[11px] text-[var(--text-muted)]">{s.decision.setupType}</td>
                  <td className="px-3 py-2 max-w-[260px] text-[11px] text-[var(--text-soft)]">{s.decision.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ── Panel B: Market Bias ──────────────────────────────────────────────────────

function MarketBiasPanel({ bias, lastScanMs, scanCount, totalScanned, healthy }: {
  bias: MarketBias;
  lastScanMs: number;
  scanCount: number;
  totalScanned: number;
  healthy: boolean;
}) {
  const pctBullish = bias.totalScanned > 0 ? Math.round((bias.bullishCount / bias.totalScanned) * 100) : 0;
  const pctBearish = bias.totalScanned > 0 ? Math.round((bias.bearishCount / bias.totalScanned) * 100) : 0;

  return (
    <Card title="Market Bias" subtitle="Aggregate direction across all scanned symbols">
      <div className="space-y-4">
        {/* Overall bias */}
        <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${biasBg(bias.direction)}`}>
          <div>
            <div className={`text-xl font-bold tracking-wide ${biasColor(bias.direction)}`}>{bias.direction}</div>
            <div className="text-[11px] text-[var(--text-muted)]">{bias.totalScanned} symbols scanned</div>
          </div>
          <div className="text-right">
            <div className={`text-sm font-semibold ${healthy ? "text-emerald-300" : "text-rose-300"}`}>
              {healthy ? "LIVE" : "STALE"}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">{fmt(lastScanMs)}</div>
          </div>
        </div>

        {/* Direction breakdown */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/8 p-3 text-center">
            <div className="text-lg font-bold text-emerald-300">{bias.bullishCount}</div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Long</div>
            <div className="text-[11px] text-emerald-400/70">{pctBullish}%</div>
          </div>
          <div className="rounded-lg border border-rose-400/20 bg-rose-400/8 p-3 text-center">
            <div className="text-lg font-bold text-rose-300">{bias.bearishCount}</div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Short</div>
            <div className="text-[11px] text-rose-400/70">{pctBearish}%</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
            <div className="text-lg font-bold text-[var(--text-soft)]">{bias.noneCount}</div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Neutral</div>
            <div className="text-[11px] text-[var(--text-muted)]">{100 - pctBullish - pctBearish}%</div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 text-[11px] text-[var(--text-muted)]">
          <span>Scan cycles: <span className="text-[var(--text-soft)]">{scanCount}</span></span>
          <span>Total processed: <span className="text-[var(--text-soft)]">{totalScanned}</span></span>
        </div>
      </div>
    </Card>
  );
}

// ── Panel C: Live Signal Feed ─────────────────────────────────────────────────

function LiveSignalFeed({ log }: { log: SignalLogEntry[] }) {
  const feedRef = useRef<HTMLDivElement>(null);

  return (
    <Card title="Live Signal Feed" subtitle="Real-time actionable signals as they fire">
      <div ref={feedRef} className="h-[260px] overflow-y-auto space-y-1 pr-1">
        {log.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-2">Waiting for signals…</p>
        ) : (
          log.map((entry, i) => (
            <div key={`${entry.symbol}-${entry.ts}-${i}`} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
              <span className="w-20 shrink-0 tabular-nums text-[10px] text-[var(--text-muted)] pt-0.5">
                {new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span className="w-24 shrink-0 font-semibold text-[var(--text-strong)]">{entry.symbol}</span>
              <span className={`w-28 shrink-0 text-[11px] ${dirColor(entry.direction)}`}>{entry.direction}</span>
              <span className={`w-32 shrink-0 text-[11px] ${classColor(entry.classification)}`}>{entry.classification.replace("_", " ")}</span>
              <span className="text-[11px] text-[var(--text-muted)] truncate">{entry.reason}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

// ── Panel D: All Signals Table ────────────────────────────────────────────────

function AllSignalsTable({ signals, filters }: { signals: MarketSignal[]; filters: Filters }) {
  const filtered = applyFilters(signals, filters);

  return (
    <Card title="All Signals" subtitle={`${filtered.length} symbols • filtered view`}>
      <div className="max-h-[480px] overflow-auto rounded-xl border border-[var(--line)]">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="sticky top-0 bg-[#0a0c14] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2">Symbol</th>
              <th className="px-3 py-2">Market</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Signal</th>
              <th className="px-3 py-2">Direction</th>
              <th className="px-3 py-2">Confidence</th>
              <th className="px-3 py-2">Setup</th>
              <th className="px-3 py-2">Move%</th>
              <th className="px-3 py-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.symbol} className="border-t border-[var(--line)] hover:bg-white/[0.02]">
                <td className="px-3 py-2 font-medium text-[var(--text-strong)]">{s.symbol}</td>
                <td className="px-3 py-2 text-[11px] text-[var(--text-muted)]">{s.marketId}</td>
                <td className="px-3 py-2 tabular-nums text-[var(--text-soft)] text-xs">
                  {s.error ? <span className="text-[var(--text-muted)]">unavailable</span> : (s.price > 0 ? `$${s.price < 1 ? s.price.toFixed(5) : s.price < 100 ? s.price.toFixed(4) : s.price.toFixed(2)}` : "—")}
                </td>
                <td className="px-3 py-2"><ScoreBar score={s.signalScore} /></td>
                <td className="px-3 py-2"><ClassBadge c={s.classification} /></td>
                <td className="px-3 py-2"><DirectionPill direction={s.decision.direction} /></td>
                <td className="px-3 py-2 text-xs tabular-nums text-[var(--text-soft)]">{s.decision.confidence}</td>
                <td className="px-3 py-2 text-[11px] text-[var(--text-muted)]">{s.decision.setupType}</td>
                <td className={`px-3 py-2 text-xs tabular-nums ${s.movePct > 0 ? "text-emerald-400" : s.movePct < 0 ? "text-rose-400" : "text-[var(--text-muted)]"}`}>
                  {s.movePct > 0 ? "+" : ""}{s.movePct.toFixed(2)}%
                </td>
                <td className="px-3 py-2 max-w-[200px] text-[11px] text-[var(--text-muted)] truncate">{s.decision.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Filter Bar ────────────────────────────────────────────────────────────────

function FilterBar({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">Filters</span>

      {/* Direction */}
      <select
        className="rounded-lg border border-[var(--line)] bg-[var(--surface-glass)] px-2.5 py-1.5 text-xs text-[var(--text-soft)] focus:outline-none"
        value={filters.direction}
        onChange={(e) => onChange({ ...filters, direction: e.target.value as Filters["direction"] })}
      >
        <option value="ALL">All Directions</option>
        <option value="LONG">Long Only</option>
        <option value="SHORT">Short Only</option>
        <option value="NONE">Neutral</option>
      </select>

      {/* Market */}
      <select
        className="rounded-lg border border-[var(--line)] bg-[var(--surface-glass)] px-2.5 py-1.5 text-xs text-[var(--text-soft)] focus:outline-none"
        value={filters.market}
        onChange={(e) => onChange({ ...filters, market: e.target.value as Filters["market"] })}
      >
        <option value="ALL">All Markets</option>
        <option value="crypto">Crypto</option>
        <option value="us">US Stocks</option>
        <option value="india">India</option>
      </select>

      {/* Confidence */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[var(--text-muted)]">Min confidence</span>
        <input
          type="range"
          min={0}
          max={80}
          step={5}
          value={filters.minConfidence}
          onChange={(e) => onChange({ ...filters, minConfidence: Number(e.target.value) })}
          className="w-24 accent-emerald-400"
        />
        <span className="w-6 text-[11px] tabular-nums text-[var(--text-soft)]">{filters.minConfidence}</span>
      </div>
    </div>
  );
}

// ── Main page component ───────────────────────────────────────────────────────

export function MarketIntelligencePage() {
  const [filters, setFilters] = useState<Filters>({ minConfidence: 0, direction: "ALL", market: "ALL" });

  const { data: snapshot, error: queryError } = useQuery<ScannerSnapshot>({
    queryKey: ["market-snapshot"],
    queryFn: async () => {
      const res = await fetch("/api/market-snapshot", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<ScannerSnapshot>;
    },
    staleTime: 25_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const error = queryError instanceof Error ? queryError.message : queryError ? "load failed" : null;
  const healthy = snapshot?.healthy ?? false;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--text-strong)]">Market Intelligence</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Continuous scan · {snapshot?.totalSymbolsScanned ?? 0} symbols processed · {snapshot?.scanCount ?? 0} cycles</p>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${healthy ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-amber-400/30 bg-amber-400/10 text-amber-300"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${healthy ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          {healthy ? "Live" : "Warming up…"}
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">{error}</div>
      ) : null}

      {/* Filters */}
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Panels: Bias + Top Opportunities */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
        <MarketBiasPanel
          bias={snapshot?.marketBias ?? { direction: "NEUTRAL", bullishCount: 0, bearishCount: 0, noneCount: 0, totalScanned: 0 }}
          lastScanMs={snapshot?.lastScanMs ?? 0}
          scanCount={snapshot?.scanCount ?? 0}
          totalScanned={snapshot?.totalSymbolsScanned ?? 0}
          healthy={healthy}
        />
        <TopOpportunitiesPanel signals={snapshot?.topOpportunities ?? []} filters={filters} />
      </div>

      {/* Live feed */}
      <LiveSignalFeed log={snapshot?.signalLog ?? []} />

      {/* All signals */}
      <AllSignalsTable signals={snapshot?.signals ?? []} filters={filters} />
    </div>
  );
}
