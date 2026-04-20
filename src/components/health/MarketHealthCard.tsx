import type { MarketHealthCard, ProviderHealthItem, SnapshotInfo } from "@/lib/health/health-types";
import { HealthStatusPill } from "./HealthStatusPill";
import { HealthTimestamp } from "./HealthTimestamp";
import { cn } from "@/lib/cn";

const MARKET_ICONS: Record<string, string> = {
  crypto: "₿",
  us: "🇺🇸",
  india: "🇮🇳",
};

const SCANNER_MODE_LABELS: Record<string, string> = {
  warmup: "Warm-Up",
  steady: "Steady State",
  backoff: "Provider Backoff",
  degraded: "Degraded",
  blocked: "Blocked",
};

const QUALITY_LABELS: Record<string, { label: string; class: string }> = {
  high: { label: "High", class: "text-emerald-400" },
  medium: { label: "Medium", class: "text-amber-400" },
  low: { label: "Low", class: "text-rose-400" },
};

function MetricItem({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.1em] text-[#70809A]">{label}</span>
      <span className={cn("text-[13px] font-medium", highlight ?? "text-[#F3F7FF]")}>{value}</span>
    </div>
  );
}

function CoverageBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="w-10 text-right text-[12px] tabular-nums text-[#A7B4C8]">{pct}%</span>
    </div>
  );
}

function ProviderRow({ provider }: { provider: ProviderHealthItem }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-[12px]">
      <span className="min-w-0 truncate text-[#A7B4C8]">{provider.name}</span>
      <div className="flex flex-shrink-0 items-center gap-2">
        {provider.lastSuccessMs && (
          <HealthTimestamp ts={provider.lastSuccessMs} className="text-[10px]" />
        )}
        <HealthStatusPill status={provider.status} size="xs" />
      </div>
    </div>
  );
}

function SnapshotBlock({ snapshot }: { snapshot: SnapshotInfo }) {
  if (!snapshot.active) return null;
  return (
    <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-amber-400">Snapshot Mode Active</span>
        {snapshot.ageMs !== null && (
          <span className="text-[10px] text-amber-400/70">
            {Math.round(snapshot.ageMs / 1000)}s old
          </span>
        )}
      </div>
      {snapshot.reason && (
        <p className="mb-2 text-[12px] text-[#A7B4C8]">{snapshot.reason}</p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {snapshot.safeFor.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] text-[#70809A]">Still reliable</p>
            <ul className="space-y-0.5">
              {snapshot.safeFor.map((item, i) => (
                <li key={i} className="flex items-start gap-1 text-[11px] text-emerald-400/80">
                  <span>✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
        )}
        {snapshot.impact.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] text-[#70809A]">Affected</p>
            <ul className="space-y-0.5">
              {snapshot.impact.map((item, i) => (
                <li key={i} className="flex items-start gap-1 text-[11px] text-amber-400/80">
                  <span>△</span> {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function MarketHealthCardComponent({ card }: { card: MarketHealthCard }) {
  const icon = MARKET_ICONS[card.key] ?? "◇";
  const quality = QUALITY_LABELS[card.metrics.signalQuality];

  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.06] bg-[#0B1728] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">{icon}</span>
          <span className="font-semibold text-[#F3F7FF]">{card.label}</span>
        </div>
        <HealthStatusPill status={card.status} size="sm" />
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* What this means */}
        <p className="text-[13px] leading-relaxed text-[#A7B4C8]">{card.whatItMeans}</p>

        {/* Quick metrics row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricItem label="Data Source" value={card.metrics.dataSource} />
          <MetricItem
            label="Signal Quality"
            value={quality?.label ?? card.metrics.signalQuality}
            highlight={quality?.class}
          />
          <MetricItem
            label="Coverage"
            value={`${card.metrics.coverage}%`}
            highlight={card.metrics.coverage >= 80 ? "text-emerald-400" : card.metrics.coverage >= 50 ? "text-amber-400" : "text-rose-400"}
          />
          <MetricItem label="Total Pairs" value={card.metrics.totalPairs.toLocaleString()} />
        </div>

        {/* Signal health */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#70809A]">Signal Health</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-[18px] font-bold tabular-nums text-[#F3F7FF]">{card.signalStats.generated1h}</div>
              <div className="text-[10px] text-[#70809A]">Generated</div>
            </div>
            <div className="text-center">
              <div className="text-[18px] font-bold tabular-nums text-emerald-400">{card.signalStats.valid1h}</div>
              <div className="text-[10px] text-[#70809A]">Published</div>
            </div>
            <div className="text-center">
              <div className="text-[18px] font-bold tabular-nums text-[#A7B4C8]">{card.signalStats.filtered1h}</div>
              <div className="text-[10px] text-[#70809A]">Filtered</div>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-[11px] text-[#70809A]">Data freshness:</span>
            <HealthStatusPill status={card.signalStats.freshnessState} size="xs" />
            {card.signalStats.freshnessAgeMs !== null && (
              <span className="text-[11px] text-[#70809A]">
                ({Math.round(card.signalStats.freshnessAgeMs / 1000)}s)
              </span>
            )}
          </div>
        </div>

        {/* Scanner health */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#70809A]">Scanner</p>
            <HealthStatusPill status={card.scanner.mode} size="xs" label={SCANNER_MODE_LABELS[card.scanner.mode] ?? card.scanner.mode} />
          </div>
          <div className="mb-2">
            <div className="mb-1 flex justify-between text-[12px]">
              <span className="text-[#A7B4C8]">Coverage</span>
              <span className="tabular-nums text-[#A7B4C8]">{card.scanner.scanned} / {card.scanner.total}</span>
            </div>
            <CoverageBar pct={card.scanner.completionPct} />
          </div>
          {card.scanner.skipped > 0 && (
            <div className="mb-2">
              <p className="mb-1.5 text-[11px] text-[#70809A]">
                {card.scanner.skipped} symbol{card.scanner.skipped !== 1 ? "s" : ""} skipped
              </p>
              <div className="flex flex-wrap gap-1.5">
                {card.scanner.reasons.slice(0, 4).map((r) => (
                  <span key={r.code} className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-[#70809A]">
                    {r.label} ({r.count})
                  </span>
                ))}
              </div>
            </div>
          )}
          {card.scanner.mode === "warmup" && (
            <p className="text-[11px] text-[#70809A]">
              Coverage is building. The system is prioritizing higher-quality symbols first.
            </p>
          )}
          {card.scanner.lastCycleDurationMs !== null && (
            <p className="mt-1 text-[11px] text-[#70809A]">
              Last cycle: {(card.scanner.lastCycleDurationMs / 1000).toFixed(1)}s
            </p>
          )}
        </div>

        {/* Providers */}
        {card.providers.length > 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#70809A]">Providers</p>
            <div className="divide-y divide-white/[0.04]">
              {card.providers.map((p) => (
                <ProviderRow key={p.name} provider={p} />
              ))}
            </div>
          </div>
        )}

        {/* Snapshot */}
        <SnapshotBlock snapshot={card.snapshot} />

        {/* Timestamps footer */}
        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-white/[0.04] pt-3">
          <HealthTimestamp ts={card.timestamps.lastUpdated} label="Updated" className="text-[11px]" />
          <HealthTimestamp ts={card.timestamps.lastSuccessfulScan} label="Last scan" className="text-[11px]" />
        </div>
      </div>
    </div>
  );
}
