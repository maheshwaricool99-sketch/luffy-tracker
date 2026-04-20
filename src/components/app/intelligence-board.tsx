"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";

// ── Column rendering helpers ──────────────────────────────────────────────────

function toLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function scoreBar(v: number, max = 100) {
  const pct = Math.min(100, Math.round((v / max) * 100));
  const color =
    pct >= 75 ? "bg-emerald-400" :
    pct >= 55 ? "bg-amber-400" :
    pct >= 35 ? "bg-sky-400" : "bg-white/20";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular-nums">{v}</span>
    </div>
  );
}

const STAGE_COLORS: Record<string, string> = {
  ACTIVE:     "border-emerald-400/30 bg-emerald-400/15 text-emerald-200",
  DEVELOPING: "border-amber-400/30 bg-amber-400/15 text-amber-200",
  EARLY:      "border-sky-400/30 bg-sky-400/15 text-sky-200",
  LATE:       "border-rose-400/30 bg-rose-400/15 text-rose-200",
};
const BIAS_COLORS: Record<string, string> = {
  bullish: "border-emerald-400/30 bg-emerald-400/15 text-emerald-200",
  bearish: "border-rose-400/30 bg-rose-400/15 text-rose-200",
  neutral: "border-white/10 bg-white/5 text-[var(--text-muted)]",
};
const FRESH_COLORS: Record<string, string> = {
  GOOD:   "border-emerald-400/30 bg-emerald-400/15 text-emerald-200",
  OK:     "border-amber-400/30 bg-amber-400/15 text-amber-200",
  STALE:  "border-rose-400/30 bg-rose-400/15 text-rose-200",
  REJECT: "border-rose-400/30 bg-rose-400/10 text-rose-300",
};

function pill(label: string, colorClass: string) {
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colorClass}`}>
      {label}
    </span>
  );
}

// Score column keys (use score bar)
const SCORE_KEYS = new Set([
  "signalScore","whaleScore","derivativesScore","heatScore",
  "accumulation","structure","volumeAnomaly","whale","derivatives",
  "catalyst","breakoutProbability","relativeStrength","confidence",
]);
// These are 0–15 range instead of 0–100
const SMALL_SCORE_KEYS = new Set(["whale","derivatives","catalyst","structure","volumeAnomaly","accumulation"]);

function renderCell(key: string, val: unknown): React.ReactNode {
  if (val === null || val === undefined) return <span className="text-[var(--text-muted)]">—</span>;
  const str = String(val);

  if (key === "stage")     return pill(str, STAGE_COLORS[str] ?? "border-white/10 bg-white/5 text-[var(--text-muted)]");
  if (key === "flowBias")  return pill(str, BIAS_COLORS[str]  ?? "border-white/10 bg-white/5 text-[var(--text-muted)]");
  if (key === "freshness") return pill(str, FRESH_COLORS[str] ?? "border-white/10 bg-white/5 text-[var(--text-muted)]");

  if (SCORE_KEYS.has(key)) {
    const n = Number(val);
    if (Number.isFinite(n)) return scoreBar(n, SMALL_SCORE_KEYS.has(key) ? 20 : 100);
  }

  if (key === "riskPenalty") {
    const n = Number(val);
    if (Number.isFinite(n)) {
      const color = n <= 4 ? "text-emerald-400" : n <= 8 ? "text-amber-400" : "text-rose-400";
      return <span className={`tabular-nums ${color}`}>-{n}</span>;
    }
  }

  if (key === "movedPct" || key === "movePct") {
    const n = Number(val);
    if (Number.isFinite(n)) {
      const color = n > 0 ? "text-emerald-400" : n < 0 ? "text-rose-400" : "text-[var(--text-muted)]";
      return <span className={`tabular-nums ${color}`}>{n > 0 ? "+" : ""}{n.toFixed(2)}%</span>;
    }
  }

  if (key === "funding") {
    const n = Number(val);
    if (Number.isFinite(n)) {
      const color = n > 0.005 ? "text-rose-400" : n < -0.005 ? "text-emerald-400" : "text-[var(--text-muted)]";
      return <span className={`tabular-nums text-xs ${color}`}>{(n * 100).toFixed(4)}%</span>;
    }
  }

  if (key === "openInterest") {
    const n = Number(val);
    if (Number.isFinite(n) && n > 0) {
      return <span className="tabular-nums text-xs text-[var(--text-soft)]">${(n / 1_000_000).toFixed(1)}M</span>;
    }
  }

  if (key === "price" || key.endsWith("Zone") || key.endsWith("zone")) {
    const n = Number(val);
    if (Number.isFinite(n) && n > 0) {
      return <span className="tabular-nums text-xs text-[var(--text-soft)]">
        ${n < 1 ? n.toFixed(5) : n < 100 ? n.toFixed(4) : n.toFixed(2)}
      </span>;
    }
  }

  if (key === "reason") {
    return <span className="text-[11px] text-[var(--text-muted)]" title={str}>{str.length > 70 ? str.slice(0, 70) + "…" : str}</span>;
  }

  // Generic number
  const n = Number(val);
  if (Number.isFinite(n) && !Number.isInteger(n)) {
    return <span className="tabular-nums text-xs text-[var(--text-soft)]">{n.toFixed(4)}</span>;
  }

  return <span className="text-xs text-[var(--text-soft)]">{str}</span>;
}

// ── Column visibility defaults ─────────────────────────────────────────────────
// Always hidden: marketId, priceSource, companyName (surfaced separately)
const ALWAYS_HIDDEN = new Set(["marketId", "priceSource"]);

// ── Sort helpers ──────────────────────────────────────────────────────────────

type IntelligenceBoardRow = Record<string, unknown>;

function sortRows(rows: IntelligenceBoardRow[], col: string, dir: "asc" | "desc"): IntelligenceBoardRow[] {
  return [...rows].sort((a, b) => {
    const av = a[col]; const bv = b[col];
    const an = Number(av); const bn = Number(bv);
    if (Number.isFinite(an) && Number.isFinite(bn)) return dir === "asc" ? an - bn : bn - an;
    return dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });
}

// ── Market tabs ───────────────────────────────────────────────────────────────

type MarketTab = { label: string; value: string };
const MARKET_TABS: MarketTab[] = [
  { label: "Crypto", value: "crypto" },
  { label: "US Stocks", value: "us" },
  { label: "India", value: "india" },
];

// ── Main component ────────────────────────────────────────────────────────────

type Props = {
  title: string;
  subtitle: string;
  endpoint: string;
  enabled: boolean;
  showMarketTabs?: boolean;
};

export function IntelligenceBoard({ title, subtitle, endpoint, enabled, showMarketTabs }: Props) {
  const [rows, setRows]         = useState<IntelligenceBoardRow[]>([]);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [market, setMarket]     = useState("crypto");
  const [search, setSearch]     = useState("");
  const [sortCol, setSortCol]   = useState<string | null>(null);
  const [sortDir, setSortDir]   = useState<"asc" | "desc">("desc");
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());

  const activeEndpoint = showMarketTabs ? `${endpoint}?marketId=${market}` : endpoint;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const load = async () => {
      try {
        const res = await fetch(activeEndpoint, { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        setRows(Array.isArray(json?.rows) ? json.rows as IntelligenceBoardRow[] : Array.isArray(json) ? json as IntelligenceBoardRow[] : []);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(() => void load(), 30_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [activeEndpoint]);

  const allColumns = useMemo(() => {
    if (rows.length === 0) return [];
    return Object.keys(rows[0]).filter((k) => !ALWAYS_HIDDEN.has(k));
  }, [rows]);

  const visibleColumns = allColumns.filter((k) => !hiddenCols.has(k));

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter((row) =>
        String(row.symbol ?? "").toLowerCase().includes(q) ||
        String(row.companyName ?? "").toLowerCase().includes(q),
      );
    }
    if (sortCol) r = sortRows(r, sortCol, sortDir);
    return r;
  }, [rows, search, sortCol, sortDir]);

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir((d) => d === "desc" ? "asc" : "desc");
    else { setSortCol(col); setSortDir("desc"); }
  }

  function toggleCol(col: string) {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col); else next.add(col);
      return next;
    });
  }

  if (!enabled) {
    return (
      <Card title={title} subtitle={subtitle}>
        <p className="text-sm text-[var(--text-soft)]">Disabled. Set <code className="text-xs">ENABLE_PREDICTION_ENGINE=true</code> to enable.</p>
      </Card>
    );
  }

  return (
    <Card title={title} subtitle={subtitle}>
      {/* Market tabs */}
      {showMarketTabs && (
        <div className="mb-3 flex gap-1">
          {MARKET_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setMarket(tab.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                market === tab.value
                  ? "border-[var(--line-strong)] bg-white/10 text-[var(--text-strong)]"
                  : "border-[var(--line)] bg-transparent text-[var(--text-muted)] hover:text-[var(--text-soft)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Controls row */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search symbol…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-[var(--line)] bg-[var(--surface-glass)] px-3 py-1.5 text-xs text-[var(--text-soft)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--line-strong)] w-40"
        />
        <span className="text-[11px] text-[var(--text-muted)]">{filtered.length} rows</span>

        {/* Column toggles */}
        {allColumns.length > 0 && (
          <div className="ml-auto flex flex-wrap gap-1">
            {allColumns.map((col) => (
              <button
                key={col}
                onClick={() => toggleCol(col)}
                className={`rounded border px-2 py-0.5 text-[10px] uppercase tracking-wide transition-colors ${
                  hiddenCols.has(col)
                    ? "border-white/5 bg-transparent text-[var(--text-muted)] opacity-40"
                    : "border-[var(--line)] bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-soft)]"
                }`}
              >
                {toLabel(col)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error / empty states */}
      {error ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">{error}</div>
      ) : !loading && filtered.length === 0 ? (
        <div className="rounded-xl border border-[var(--line)] bg-black/20 px-4 py-3 text-sm text-[var(--text-soft)]">
          No qualifying rows right now.{search ? " Try clearing the search filter." : " The engine is healthy — no setup met the current threshold."}
        </div>
      ) : null}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="max-h-[70vh] overflow-auto rounded-xl border border-[var(--line)]">
          <table className="w-full min-w-max text-left text-sm">
            <thead className="sticky top-0 bg-[#0a0c14] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              <tr>
                {visibleColumns.map((col) => (
                  <th
                    key={col}
                    className="cursor-pointer select-none px-3 py-2 font-medium hover:text-[var(--text-soft)] whitespace-nowrap"
                    onClick={() => toggleSort(col)}
                  >
                    {toLabel(col)}
                    {sortCol === col && (
                      <span className="ml-1 text-[var(--text-strong)]">{sortDir === "desc" ? "↓" : "↑"}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={`${row.symbol ?? i}`} className="border-t border-[var(--line)] hover:bg-white/[0.02]">
                  {visibleColumns.map((col) => (
                    <td key={col} className="px-3 py-2 whitespace-nowrap">
                      {col === "symbol" ? (
                        <div>
                          <div className="font-semibold text-[var(--text-strong)]">{String(row[col] ?? "—")}</div>
                          {typeof row.companyName === "string" && row.companyName ? (
                            <div className="text-[10px] text-[var(--text-muted)]">{row.companyName}</div>
                          ) : null}
                        </div>
                      ) : renderCell(col, row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
