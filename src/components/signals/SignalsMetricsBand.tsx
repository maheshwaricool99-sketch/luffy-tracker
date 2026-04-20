import { memo } from "react";
import type { SignalsPulseDto } from "@/lib/signals/types/signalDtos";
import { cn } from "@/lib/cn";

function MetricCard({
  label,
  value,
  context,
  badge,
  cta,
  accent,
}: {
  label: string;
  value: string;
  context: string;
  badge?: string;
  cta?: { label: string; href: string };
  accent?: "green" | "amber" | "blue" | "rose";
}) {
  const valueColor =
    accent === "green" ? "text-emerald-400" :
    accent === "blue" ? "text-blue-400" :
    accent === "amber" ? "text-amber-400" :
    accent === "rose" ? "text-rose-400" :
    "text-[#F3F7FF]";

  return (
    <div className="flex min-h-[80px] flex-col justify-between rounded-2xl border border-white/[0.06] bg-[#0B1728] px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.1em] text-[#70809A]">{label}</span>
        {badge && (
          <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-[#70809A]">
            {badge}
          </span>
        )}
      </div>
      <div className={cn("text-[22px] font-bold tabular-nums leading-tight", valueColor)}>{value}</div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#70809A]">{context}</span>
        {cta && (
          <a href={cta.href} className="text-[11px] font-semibold text-[#5B8CFF] hover:text-[#8DB6FF]">
            {cta.label} →
          </a>
        )}
      </div>
    </div>
  );
}

function MetricsBandComponent({ pulse, role }: { pulse: SignalsPulseDto | null; role: string }) {
  const isPremium = role === "PREMIUM" || role === "ADMIN" || role === "SUPERADMIN";

  if (!pulse) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-[80px] animate-pulse rounded-2xl border border-white/[0.06] bg-[#0B1728]" />
        ))}
      </div>
    );
  }

  const sentimentLabel =
    pulse.marketSentiment.bullishPct > 55 ? "Bullish bias" :
    pulse.marketSentiment.bearishPct > 55 ? "Bearish bias" :
    "Mixed sentiment";

  const sentimentAccent =
    pulse.marketSentiment.bullishPct > 55 ? "green" :
    pulse.marketSentiment.bearishPct > 55 ? "rose" : undefined;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <MetricCard
        label="Live Opportunities"
        value={String(pulse.activeSignals)}
        context={`${pulse.todayCounts.total} published today`}
        badge={pulse.delayed ? "Delayed" : "Live"}
        accent={pulse.activeSignals > 0 ? "green" : undefined}
      />
      <MetricCard
        label="Avg Confidence"
        value={pulse.averageConfidence > 0 ? `${pulse.averageConfidence}%` : "—"}
        context="Across active signals"
        accent={pulse.averageConfidence >= 80 ? "green" : pulse.averageConfidence >= 65 ? "amber" : undefined}
      />
      <MetricCard
        label="Market Sentiment"
        value={`${pulse.marketSentiment.bullishPct}% Bull`}
        context={sentimentLabel}
        accent={sentimentAccent}
      />
      <MetricCard
        label="Markets Active"
        value={[
          pulse.todayCounts.crypto > 0 && "Crypto",
          pulse.todayCounts.us > 0 && "US",
          pulse.todayCounts.india > 0 && "India",
        ].filter(Boolean).join(" · ") || "—"}
        context={`${pulse.todayCounts.crypto}C · ${pulse.todayCounts.us}US · ${pulse.todayCounts.india}IN`}
      />
      <MetricCard
        label="30D Win Rate"
        value={!pulse.winRate30d.locked && pulse.winRate30d.value != null ? `${pulse.winRate30d.value}%` : "—"}
        context={pulse.winRate30d.locked ? "Premium only" : "Closed trades"}
        accent={!pulse.winRate30d.locked && (pulse.winRate30d.value ?? 0) >= 55 ? "green" : undefined}
        cta={pulse.winRate30d.locked ? { label: "Unlock", href: "/pricing" } : undefined}
      />
      {isPremium ? (
        <MetricCard
          label="Last Signal"
          value={pulse.lastSignal.symbol ?? "—"}
          context={
            pulse.lastSignal.publishedAt
              ? new Date(pulse.lastSignal.publishedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
              : "No recent signals"
          }
          accent="blue"
        />
      ) : (
        <MetricCard
          label="Full Intel"
          value="Premium"
          context="Entry · Stop · Targets · R/R"
          cta={{ label: "Upgrade", href: "/pricing" }}
        />
      )}
    </div>
  );
}

export const SignalsMetricsBand = memo(MetricsBandComponent);
