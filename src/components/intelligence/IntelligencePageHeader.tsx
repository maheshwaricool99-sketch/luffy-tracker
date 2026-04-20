import type { IntelligencePageStats } from "@/lib/intelligence/types";

function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "green" | "amber" | "red";
}) {
  const color = accent === "green" ? "text-emerald-300" : accent === "amber" ? "text-amber-300" : accent === "red" ? "text-rose-300" : "text-[#F3F7FF]";
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <span className="text-[11px] text-[#70809A]">{label}</span>
      <span className={`text-[13px] font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

function FeedHealthBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? "text-emerald-400" : pct >= 60 ? "text-amber-400" : "text-rose-400";
  const barColor = pct >= 80 ? "bg-emerald-400" : pct >= 60 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <span className="text-[11px] text-[#70809A]">Feed Health</span>
      <div className="h-1.5 w-16 rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[13px] font-semibold tabular-nums ${color}`}>{pct}%</span>
    </div>
  );
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function IntelligencePageHeader({
  stats,
  isPremium,
}: {
  stats: IntelligencePageStats;
  isPremium: boolean;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1.5">
        <h1 className="text-[24px] font-bold tracking-tight text-[#F3F7FF]">Intelligence</h1>
        <p className="mt-0.5 text-[13px] text-[#70809A]">
          High-conviction market opportunities ranked by confidence, structure, freshness, and data integrity.
        </p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatChip label="Active Signals" value={stats.totalLive} accent="green" />
        {stats.premiumCount > 0 && (
          <StatChip
            label="Premium Priority"
            value={`${stats.premiumCount} ${!isPremium ? "🔒" : ""}`}
            accent={isPremium ? "green" : "amber"}
          />
        )}
        <StatChip
          label="Markets"
          value={stats.marketsActive.join(" / ") || "—"}
        />
        <StatChip label="Last Update" value={fmtTime(stats.lastRefreshAt)} />
        <FeedHealthBar pct={stats.feedHealthPct} />
      </div>
    </div>
  );
}
