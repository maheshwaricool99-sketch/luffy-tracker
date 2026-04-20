import type { FreshnessBadge } from "@/lib/signals/types/signalEnums";
import { cn } from "@/lib/cn";

const FRESHNESS_STYLES: Record<FreshnessBadge, string> = {
  FRESH: "border-emerald-500/30 bg-emerald-500/12 text-emerald-400",
  AGING: "border-amber-500/30 bg-amber-500/12 text-amber-400",
  STALE: "border-rose-500/30 bg-rose-500/12 text-rose-400",
};

const FRESHNESS_LABELS: Record<FreshnessBadge, string> = {
  FRESH: "Live",
  AGING: "Aging",
  STALE: "Stale",
};

const FRESHNESS_DOTS: Record<FreshnessBadge, string> = {
  FRESH: "bg-emerald-400 animate-pulse",
  AGING: "bg-amber-400",
  STALE: "bg-rose-400",
};

export function FreshnessPill({
  badge,
  ageSeconds,
  isDelayed,
  size = "sm",
}: {
  badge: FreshnessBadge;
  ageSeconds?: number;
  isDelayed?: boolean;
  size?: "xs" | "sm";
}) {
  const sizeClass = size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[11px]";
  const label = isDelayed ? "Delayed" : FRESHNESS_LABELS[badge];
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border font-medium",
      sizeClass,
      isDelayed ? "border-amber-500/30 bg-amber-500/12 text-amber-400" : FRESHNESS_STYLES[badge],
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", isDelayed ? "bg-amber-400" : FRESHNESS_DOTS[badge])} />
      {ageSeconds != null && !isDelayed
        ? ageSeconds < 60
          ? `${ageSeconds}s`
          : ageSeconds < 3600
          ? `${Math.floor(ageSeconds / 60)}m`
          : label
        : label}
    </span>
  );
}
