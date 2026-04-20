import { cn } from "@/lib/cn";

type Tone = "green" | "amber" | "red" | "blue" | "gray" | "neutral";

const STYLES: Record<Tone, string> = {
  green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  red: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  blue: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  gray: "border-white/10 bg-white/[0.04] text-[#A7B4C8]",
  neutral: "border-white/10 bg-white/[0.03] text-[#9FB1C7]",
};

const LABELS: Record<string, { label: string; tone: Tone }> = {
  live: { label: "LIVE", tone: "green" },
  degraded: { label: "DEGRADED", tone: "amber" },
  down: { label: "DOWN", tone: "red" },
  starting: { label: "STARTING", tone: "blue" },
  restarting: { label: "RESTARTING", tone: "blue" },
  paused: { label: "PAUSED", tone: "gray" },
  active: { label: "ACTIVE", tone: "green" },
  inactive_by_design: { label: "INACTIVE BY DESIGN", tone: "blue" },
  disabled_by_admin: { label: "DISABLED BY ADMIN", tone: "amber" },
  error: { label: "ERROR", tone: "red" },
  operational: { label: "OPERATIONAL", tone: "green" },
  partial_outage: { label: "PARTIAL OUTAGE", tone: "red" },
};

export function EngineStatusBadge({ status, className }: { status: string; className?: string }) {
  const config = LABELS[status] ?? { label: status.toUpperCase(), tone: "neutral" as Tone };
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full border px-2.5 text-[11px] font-semibold uppercase tracking-[0.14em]",
        STYLES[config.tone],
        className,
      )}
    >
      {config.label}
    </span>
  );
}
