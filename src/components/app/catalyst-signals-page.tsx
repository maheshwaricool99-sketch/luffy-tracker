"use client";

/**
 * CATALYST SIGNALS PAGE — CLIENT COMPONENT
 *
 * ISOLATION GUARANTEE:
 *   This component imports ONLY from:
 *     - src/lib/catalyst/types  (read-only types)
 *     - src/components/ui/      (shared UI primitives)
 *     - src/lib/cn              (classname utility)
 *   It does NOT import from any trading, execution, portfolio, or engine module.
 *
 * This page is WATCH-ONLY. It has no Buy / Sell / Execute / Paper Trade buttons.
 * No trade or order functions are reachable from this component.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  AssetType,
  CatalystSignal,
  CatalystSignalsResponse,
  ProviderStatus,
  RiskLevel,
  RiskTag,
  ScoreBreakdown,
  SignalCategory,
} from "@/lib/catalyst/types";
import { SIGNAL_CATEGORY_LABELS } from "@/lib/catalyst/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type AssetFilter = "all" | "stocks" | "crypto";
type FreshnessFilter = "all" | "1h" | "4h" | "24h";
type RiskFilter = "all" | "low" | "medium" | "high" | "extreme";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtAge(ms: number): string {
  const age = Date.now() - ms;
  const m = Math.floor(age / 60_000);
  const h = Math.floor(age / 3_600_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1)  return `${h}h ago`;
  if (m >= 1)  return `${m}m ago`;
  return "just now";
}

function fmtPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1)    return p.toFixed(4);
  return p.toFixed(6);
}

function fmtPct(n: number, sign = true): string {
  const s = sign && n >= 0 ? "+" : "";
  return `${s}${n.toFixed(1)}%`;
}

// ── Mini color helpers ────────────────────────────────────────────────────────

const RISK_COLORS: Record<RiskLevel, string> = {
  low:     "text-emerald-300 border-emerald-400/30 bg-emerald-400/10",
  medium:  "text-amber-300   border-amber-400/30   bg-amber-400/10",
  high:    "text-orange-300  border-orange-400/30  bg-orange-400/10",
  extreme: "text-rose-300    border-rose-400/35    bg-rose-400/12",
};

const RISK_TAG_LABELS: Record<RiskTag, string> = {
  "hype-only":         "Hype Only",
  "unconfirmed":       "Unconfirmed",
  "social-only":       "Social Only",
  "official-news":     "Official News",
  "low-float-danger":  "Low Float",
  "squeeze-risk":      "Squeeze Risk",
  "rumor-risk":        "Rumor Risk",
  "extreme-volatility":"Extreme Volatility",
  "thin-liquidity":    "Thin Liquidity",
  "strong-catalyst":   "Strong Catalyst",
  "likely-pump-dump":  "Pump Risk",
};

const RISK_TAG_COLORS: Record<RiskTag, string> = {
  "hype-only":         "border-amber-400/30   bg-amber-400/10   text-amber-300",
  "unconfirmed":       "border-yellow-400/30  bg-yellow-400/10  text-yellow-300",
  "social-only":       "border-purple-400/30  bg-purple-400/10  text-purple-300",
  "official-news":     "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  "low-float-danger":  "border-orange-400/30  bg-orange-400/10  text-orange-300",
  "squeeze-risk":      "border-rose-400/30    bg-rose-400/10    text-rose-300",
  "rumor-risk":        "border-yellow-400/30  bg-yellow-400/10  text-yellow-300",
  "extreme-volatility":"border-rose-400/35    bg-rose-400/12    text-rose-300",
  "thin-liquidity":    "border-orange-400/30  bg-orange-400/10  text-orange-300",
  "strong-catalyst":   "border-cyan-400/30    bg-cyan-400/10    text-cyan-300",
  "likely-pump-dump":  "border-red-500/40     bg-red-500/12     text-red-300",
};

const CATEGORY_COLORS: Partial<Record<SignalCategory, string>> = {
  "narrative-pivot":   "text-sky-300",
  "treasury-reserve":  "text-amber-300",
  "listing-catalyst":  "text-emerald-300",
  "meme-social-surge": "text-purple-300",
  "possible-squeeze":  "text-rose-300",
  "partnership-deal":  "text-cyan-300",
  "news-breakout":     "text-blue-300",
  "onchain-ecosystem": "text-teal-300",
  "product-launch":    "text-indigo-300",
  "unusual-volume":    "text-slate-300",
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-rose-300";
  if (score >= 65) return "text-amber-300";
  if (score >= 50) return "text-sky-300";
  return "text-[var(--text-soft)]";
}

function scoreBarColor(score: number): string {
  if (score >= 80) return "bg-rose-400";
  if (score >= 65) return "bg-amber-400";
  if (score >= 50) return "bg-sky-400";
  return "bg-slate-500";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", RISK_COLORS[level])}>
      {level}
    </span>
  );
}

function RiskTagBadge({ tag }: { tag: RiskTag }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide", RISK_TAG_COLORS[tag])}>
      {RISK_TAG_LABELS[tag]}
    </span>
  );
}

function ScoreBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-36 shrink-0 text-[11px] text-[var(--text-muted)]">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-white/[0.06]">
        <div
          className={cn("h-full rounded-full transition-all", scoreBarColor(value))}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={cn("w-8 text-right text-[11px] font-mono", scoreColor(value))}>{value}</span>
    </div>
  );
}

function ProviderDot({ status }: { status: ProviderStatus }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-1.5 w-1.5 rounded-full", status.healthy ? "bg-emerald-400" : "bg-rose-400")} />
      <span className="text-[11px] text-[var(--text-soft)]">{status.name}</span>
      {!status.healthy && (
        <span className="text-[10px] text-rose-400">({status.errorMessage ?? "offline"})</span>
      )}
    </div>
  );
}

// ── Score Breakdown Panel ─────────────────────────────────────────────────────

function ScoreBreakdownPanel({ bd }: { bd: ScoreBreakdown }) {
  return (
    <div className="space-y-1.5">
      <ScoreBar value={bd.priceSpikeScore}            label="Price spike" />
      <ScoreBar value={bd.relativeVolumeScore}         label="Volume anomaly" />
      <ScoreBar value={bd.keywordStrengthScore}        label="Keyword match" />
      <ScoreBar value={bd.sourceCredibilityScore}      label="Source credibility" />
      <ScoreBar value={bd.mentionsSpikeScore}          label="Social mentions" />
      <ScoreBar value={bd.sentimentScore}              label="Sentiment" />
      <ScoreBar value={bd.floatOrVolatilityRiskScore}  label="Float / volatility" />
      <ScoreBar value={bd.freshnessScore}              label="Freshness" />
    </div>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function DetailDrawer({ signal, onClose }: { signal: CatalystSignal; onClose: () => void }) {
  const catColor = CATEGORY_COLORS[signal.category] ?? "text-[var(--text-soft)]";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="relative h-full w-full max-w-xl overflow-y-auto bg-[#090f17] border-l border-[var(--line)] p-6 shadow-[inset_1px_0_0_rgba(255,255,255,0.04)] smooth-scroll-pane"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-lg font-bold text-[var(--text-strong)]">{signal.symbol}</span>
              <span className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">
                {signal.assetType}
              </span>
            </div>
            {signal.name && <p className="text-sm text-[var(--text-soft)]">{signal.name}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-[12px] text-[var(--text-soft)] hover:border-[var(--line-strong)] hover:text-white"
          >
            Close
          </button>
        </div>

        {/* Watch-only reminder */}
        <div className="mb-5 rounded-xl border border-amber-400/25 bg-amber-400/08 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">
            Watch Only — No Trading Actions Available
          </p>
          <p className="mt-0.5 text-[11px] text-amber-300/70">
            This signal is for monitoring and discovery only.
          </p>
        </div>

        {/* Price + movement */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-glass)] p-3">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Price</p>
            <p className="font-mono text-base font-semibold text-[var(--text-strong)]">${fmtPrice(signal.currentPrice)}</p>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-glass)] p-3">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">24h Change</p>
            <p className={cn("font-mono text-base font-semibold", signal.dailyChangePct >= 0 ? "text-emerald-300" : "text-rose-300")}>
              {fmtPct(signal.dailyChangePct)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-glass)] p-3">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Rel. Volume</p>
            <p className="font-mono text-base font-semibold text-[var(--text-strong)]">{signal.relativeVolume.toFixed(1)}×</p>
          </div>
        </div>

        {/* Category + risk */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className={cn("text-xs font-semibold uppercase tracking-wider", catColor)}>
            {SIGNAL_CATEGORY_LABELS[signal.category]}
          </span>
          <RiskBadge level={signal.riskLevel} />
          {signal.riskTags.map((tag) => <RiskTagBadge key={tag} tag={tag} />)}
        </div>

        {/* Signal score */}
        <div className="mb-5 rounded-xl border border-[var(--line)] bg-[var(--surface-glass)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">Signal Score</p>
            <div className="flex items-center gap-3">
              <span className={cn("font-mono text-2xl font-bold", scoreColor(signal.signalScore))}>
                {signal.signalScore}
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">/ 100</span>
            </div>
          </div>
          <ScoreBreakdownPanel bd={signal.scoreBreakdown} />
          <div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-3">
            <span className="text-[11px] text-[var(--text-muted)]">Confidence</span>
            <span className={cn("font-mono text-sm font-semibold", scoreColor(signal.confidence))}>
              {signal.confidence}%
            </span>
          </div>
        </div>

        {/* Why interesting */}
        <div className="mb-4 rounded-xl border border-cyan-400/20 bg-cyan-400/05 p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Why Detected</p>
          <p className="text-[13px] leading-6 text-[var(--text-soft)]">{signal.whyInteresting}</p>
        </div>

        {/* Why dangerous */}
        <div className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/05 p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-rose-400">Risk Notes</p>
          <p className="text-[13px] leading-6 text-[var(--text-soft)]">{signal.whyDangerous}</p>
        </div>

        {/* Matched keywords */}
        {signal.matchedKeywords.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Matched Keywords</p>
            <div className="flex flex-wrap gap-1.5">
              {signal.matchedKeywords.map((kw) => (
                <span key={kw.keyword} className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-white/[0.04] px-2.5 py-1 text-[11px] text-[var(--text-soft)]">
                  <span className="text-[var(--accent)]">{kw.keyword}</span>
                  <span className="text-[var(--text-muted)]">({kw.theme})</span>
                  <span className="text-[10px] text-[var(--text-muted)]">{kw.weight}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Headlines */}
        {signal.matchedHeadlines.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Headlines</p>
            <div className="space-y-2">
              {signal.matchedHeadlines.map((h, i) => (
                <div key={i} className="rounded-lg border border-[var(--line)] bg-[var(--surface-glass)] p-3">
                  <p className="text-[13px] leading-5 text-[var(--text-strong)]">{h.title}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{h.source}</span>
                    <span className="text-[var(--text-muted)]">·</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{fmtAge(h.publishedAtMs)}</span>
                    <span className="text-[var(--text-muted)]">·</span>
                    <span className={cn("text-[10px]", h.credibilityScore >= 70 ? "text-emerald-400" : "text-amber-400")}>
                      cred {h.credibilityScore}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Social posts */}
        {signal.matchedPosts.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Social Snippets</p>
            <div className="space-y-2">
              {signal.matchedPosts.slice(0, 3).map((post, i) => (
                <div key={i} className="rounded-lg border border-purple-400/15 bg-purple-400/04 p-3">
                  <p className="text-[12px] italic text-[var(--text-soft)]">&quot;{post.snippet}&quot;</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-purple-400/70">{post.platform}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Freshness */}
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-glass)] p-3">
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Detected</p>
          <p className="mt-0.5 text-[12px] text-[var(--text-soft)]">{fmtAge(signal.detectedAtMs)}</p>
        </div>
      </div>
    </div>
  );
}

// ── Signal Row / Card ─────────────────────────────────────────────────────────

function SignalRow({ signal, onSelect }: { signal: CatalystSignal; onSelect: () => void }) {
  const catColor = CATEGORY_COLORS[signal.category] ?? "text-[var(--text-muted)]";
  const priceColor = signal.dailyChangePct >= 0 ? "text-emerald-300" : "text-rose-300";

  return (
    <tr
      className="group cursor-pointer border-b border-[var(--line)] hover:bg-white/[0.03]"
      onClick={onSelect}
    >
      {/* Symbol */}
      <td className="py-3 pl-4 pr-3">
        <div className="flex items-center gap-2">
          <span className={cn("h-1.5 w-1.5 rounded-full", signal.assetType === "stock" ? "bg-sky-400" : "bg-amber-400")} />
          <span className="font-mono text-[13px] font-semibold text-[var(--text-strong)]">{signal.symbol}</span>
        </div>
        {signal.name && (
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)] truncate max-w-[120px]">{signal.name}</p>
        )}
      </td>

      {/* Category */}
      <td className="py-3 px-3 hidden md:table-cell">
        <span className={cn("text-[11px] font-medium", catColor)}>
          {SIGNAL_CATEGORY_LABELS[signal.category]}
        </span>
      </td>

      {/* Price + change */}
      <td className="py-3 px-3">
        <div className="font-mono text-[12px] text-[var(--text-strong)]">${fmtPrice(signal.currentPrice)}</div>
        <div className={cn("font-mono text-[11px]", priceColor)}>{fmtPct(signal.dailyChangePct)}</div>
      </td>

      {/* Rel. volume */}
      <td className="py-3 px-3 hidden sm:table-cell">
        <span className={cn("font-mono text-[12px]", signal.relativeVolume >= 5 ? "text-amber-300" : "text-[var(--text-soft)]")}>
          {signal.relativeVolume.toFixed(1)}×
        </span>
      </td>

      {/* Score */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-2">
          <div className="h-1 w-16 overflow-hidden rounded-full bg-white/[0.06]">
            <div className={cn("h-full rounded-full", scoreBarColor(signal.signalScore))} style={{ width: `${signal.signalScore}%` }} />
          </div>
          <span className={cn("font-mono text-[13px] font-semibold", scoreColor(signal.signalScore))}>
            {signal.signalScore}
          </span>
        </div>
      </td>

      {/* Risk */}
      <td className="py-3 px-3 hidden lg:table-cell">
        <RiskBadge level={signal.riskLevel} />
      </td>

      {/* Age */}
      <td className="py-3 px-3 hidden xl:table-cell">
        <span className="text-[11px] text-[var(--text-muted)]">{fmtAge(signal.detectedAtMs)}</span>
      </td>

      {/* Reason summary */}
      <td className="py-3 pl-3 pr-4 hidden 2xl:table-cell">
        <p className="max-w-xs truncate text-[11px] text-[var(--text-muted)]">{signal.reasonSummary}</p>
      </td>
    </tr>
  );
}

// ── Summary bar metrics ───────────────────────────────────────────────────────

function SummaryMetric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold text-[var(--text-strong)] truncate">{value}</p>
      {sub && <p className="text-[10px] text-[var(--text-muted)] truncate">{sub}</p>}
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────

export function CatalystSignalsPageClient() {
  const [data, setData]           = useState<CatalystSignalsResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [selected, setSelected]   = useState<CatalystSignal | null>(null);
  const [assetFilter, setAssetFilter]   = useState<AssetFilter>("all");
  const [riskFilter, setRiskFilter]     = useState<RiskFilter>("all");
  const [freshFilter, setFreshFilter]   = useState<FreshnessFilter>("all");
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [showWatchlist, setShowWatchlist] = useState(false);
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const url = `/api/catalyst-signals${refresh ? "?refresh=1" : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as CatalystSignalsResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load signals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // Auto-refresh every 5 minutes
    refreshTimer.current = setInterval(() => void load(), 5 * 60_000);
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [load]);

  // ── Filter logic ────────────────────────────────────────────────────────────
  const signals = (data?.topSignals ?? []).filter((s) => {
    if (assetFilter === "stocks" && s.assetType !== "stock") return false;
    if (assetFilter === "crypto" && s.assetType !== "crypto") return false;
    if (riskFilter !== "all" && s.riskLevel !== riskFilter) return false;
    if (freshFilter !== "all") {
      const ageMs = Date.now() - s.detectedAtMs;
      const limitMs =
        freshFilter === "1h"  ? 60 * 60_000 :
        freshFilter === "4h"  ? 4 * 60 * 60_000 :
                                24 * 60 * 60_000;
      if (ageMs > limitMs) return false;
    }
    if (showWatchlist && !watchlist.has(s.symbol)) return false;
    return true;
  });

  const topStock  = data?.topSignals.find((s) => s.assetType === "stock");
  const topCrypto = data?.topSignals.find((s) => s.assetType === "crypto");
  const healthyCount = data?.providerHealth.filter((p) => p.healthy).length ?? 0;
  const totalProviders = data?.providerHealth.length ?? 0;

  // ── Watchlist toggle ────────────────────────────────────────────────────────
  const toggleWatch = useCallback((symbol: string) => {
    setWatchlist((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  }, []);

  // ── Filter tab helper ────────────────────────────────────────────────────────
  const filterTab = (active: boolean, label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
        active
          ? "border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]"
          : "border border-transparent text-[var(--text-soft)] hover:bg-white/[0.06] hover:text-[var(--text-strong)]",
      )}
    >
      {label}
    </button>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="rounded-3xl border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_24px_80px_rgba(2,8,20,0.45)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                Watch-Only · Catalyst Intelligence
              </p>
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                No Trading Enabled
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-strong)] md:text-3xl">
              Catalyst Signals
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
              Surfaces US stocks and crypto assets showing sudden narrative shifts, partnership announcements,
              social momentum spikes, treasury moves, and unusual volume. For discovery and monitoring only.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => void load(true)} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-400/08 px-4 py-3">
          <p className="text-sm text-rose-300">Error loading signals: {error}</p>
        </div>
      )}

      {/* ── Warnings ── */}
      {data?.warnings && data.warnings.length > 0 && (
        <div className="space-y-1">
          {data.warnings.map((w, i) => (
            <div key={i} className="rounded-lg border border-amber-400/20 bg-amber-400/06 px-3 py-2">
              <p className="text-[12px] text-amber-300">⚠ {w}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Summary bar ── */}
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Card className="p-0">
            <div className="px-4 py-3">
              <SummaryMetric
                label="Last Refresh"
                value={data.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : "--"}
              />
            </div>
          </Card>
          <Card className="p-0">
            <div className="px-4 py-3">
              <SummaryMetric
                label="Total Signals"
                value={String(data.totalCandidates)}
                sub={`${data.topSignals.length} ranked`}
              />
            </div>
          </Card>
          <Card className="p-0">
            <div className="px-4 py-3">
              <SummaryMetric
                label="Top Stock"
                value={topStock?.symbol ?? "--"}
                sub={topStock ? `score ${topStock.signalScore}` : undefined}
              />
            </div>
          </Card>
          <Card className="p-0">
            <div className="px-4 py-3">
              <SummaryMetric
                label="Top Crypto"
                value={topCrypto?.symbol ?? "--"}
                sub={topCrypto ? `score ${topCrypto.signalScore}` : undefined}
              />
            </div>
          </Card>
          <Card className="p-0">
            <div className="px-4 py-3">
              <SummaryMetric
                label="Watchlist"
                value={String(watchlist.size)}
                sub="symbols watching"
              />
            </div>
          </Card>
          <Card className="p-0">
            <div className="px-4 py-3">
              <SummaryMetric
                label="Providers"
                value={`${healthyCount}/${totalProviders}`}
                sub={healthyCount === totalProviders ? "all healthy" : "degraded"}
              />
            </div>
          </Card>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-glass)] px-4 py-3">
        {/* Asset type */}
        <div className="flex items-center gap-1 border-r border-[var(--line)] pr-3">
          {filterTab(assetFilter === "all",    "All",    () => setAssetFilter("all"))}
          {filterTab(assetFilter === "stocks", "Stocks", () => setAssetFilter("stocks"))}
          {filterTab(assetFilter === "crypto", "Crypto", () => setAssetFilter("crypto"))}
        </div>

        {/* Risk filter */}
        <div className="flex items-center gap-1 border-r border-[var(--line)] pr-3">
          {filterTab(riskFilter === "all",     "Any Risk",  () => setRiskFilter("all"))}
          {filterTab(riskFilter === "extreme", "Extreme",   () => setRiskFilter("extreme"))}
          {filterTab(riskFilter === "high",    "High Risk", () => setRiskFilter("high"))}
        </div>

        {/* Freshness filter */}
        <div className="flex items-center gap-1 border-r border-[var(--line)] pr-3">
          {filterTab(freshFilter === "all",  "All Time", () => setFreshFilter("all"))}
          {filterTab(freshFilter === "1h",   "< 1h",     () => setFreshFilter("1h"))}
          {filterTab(freshFilter === "4h",   "< 4h",     () => setFreshFilter("4h"))}
          {filterTab(freshFilter === "24h",  "< 24h",    () => setFreshFilter("24h"))}
        </div>

        {/* Watchlist toggle */}
        {filterTab(showWatchlist, `Watchlist (${watchlist.size})`, () => setShowWatchlist((v) => !v))}
      </div>

      {/* ── Signals table ── */}
      <Card className="overflow-hidden p-0">
        {loading && !data ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm text-[var(--text-muted)]">Loading catalyst signals…</p>
          </div>
        ) : signals.length === 0 ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm text-[var(--text-muted)]">No signals match the current filters.</p>
          </div>
        ) : (
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--line)] bg-white/[0.02]">
                  <th className="py-2.5 pl-4 pr-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Symbol</th>
                  <th className="hidden py-2.5 px-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] md:table-cell">Category</th>
                  <th className="py-2.5 px-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Price / Move</th>
                  <th className="hidden py-2.5 px-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] sm:table-cell">Rel. Vol</th>
                  <th className="py-2.5 px-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Score</th>
                  <th className="hidden py-2.5 px-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] lg:table-cell">Risk</th>
                  <th className="hidden py-2.5 px-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] xl:table-cell">Age</th>
                  <th className="hidden py-2.5 pl-3 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] 2xl:table-cell">Reason</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((signal) => (
                  <SignalRow
                    key={signal.id}
                    signal={signal}
                    onSelect={() => setSelected(signal)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table footer */}
        {signals.length > 0 && (
          <div className="flex items-center justify-between border-t border-[var(--line)] px-4 py-2.5">
            <p className="text-[11px] text-[var(--text-muted)]">
              {signals.length} signal{signals.length !== 1 ? "s" : ""} · Click any row for details
            </p>
            <p className="hidden text-[10px] uppercase tracking-widest text-amber-300 sm:block">
              Watch-Only — No Trading Actions Available
            </p>
          </div>
        )}
      </Card>

      {/* ── Signal cards (mobile-friendly alternative view) ── */}
      <div className="grid gap-3 sm:hidden">
        {signals.map((signal) => {
          const catColor = CATEGORY_COLORS[signal.category] ?? "text-[var(--text-muted)]";
          const watching = watchlist.has(signal.symbol);
          return (
            <div key={signal.id} className="group cursor-pointer rounded-2xl border border-[var(--line)] bg-[var(--surface-glass)] p-4 shadow-[0_16px_40px_rgba(2,8,20,0.34)] backdrop-blur-xl hover:border-[var(--line-strong)]" onClick={() => setSelected(signal)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn("h-1.5 w-1.5 rounded-full", signal.assetType === "stock" ? "bg-sky-400" : "bg-amber-400")} />
                    <span className="font-mono text-sm font-bold text-[var(--text-strong)]">{signal.symbol}</span>
                  </div>
                  <p className={cn("mt-0.5 text-[11px]", catColor)}>{SIGNAL_CATEGORY_LABELS[signal.category]}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("font-mono text-lg font-bold", scoreColor(signal.signalScore))}>
                    {signal.signalScore}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleWatch(signal.symbol); }}
                    className={cn("rounded-lg border px-2 py-1 text-[11px]", watching
                      ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                      : "border-[var(--line)] text-[var(--text-muted)]")}
                  >
                    {watching ? "Watching" : "Watch"}
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3 text-[12px]">
                <span className="font-mono text-[var(--text-strong)]">${fmtPrice(signal.currentPrice)}</span>
                <span className={signal.dailyChangePct >= 0 ? "text-emerald-300" : "text-rose-300"}>
                  {fmtPct(signal.dailyChangePct)}
                </span>
                <span className="text-[var(--text-muted)]">{signal.relativeVolume.toFixed(1)}× vol</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <RiskBadge level={signal.riskLevel} />
                {signal.riskTags.slice(0, 2).map((tag) => <RiskTagBadge key={tag} tag={tag} />)}
              </div>
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">{signal.reasonSummary}</p>
            </div>
          );
        })}
      </div>

      {/* ── Provider health footer ── */}
      {data && data.providerHealth.length > 0 && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-glass)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Data Sources
            </p>
            {data.providerHealth.map((p) => (
              <ProviderDot key={p.name} status={p} />
            ))}
          </div>
        </div>
      )}

      {/* ── Detail drawer ── */}
      {selected && (
        <DetailDrawer signal={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
