import type { SignalDirection } from "@/lib/signals/types/signalEnums";
import { cn } from "@/lib/cn";

export function DirectionPill({ direction, size = "sm" }: { direction: SignalDirection; size?: "xs" | "sm" }) {
  const isLong = direction === "LONG";
  const sizeClass = size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]";
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border font-semibold uppercase tracking-wide",
      sizeClass,
      isLong
        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
        : "border-rose-500/30 bg-rose-500/15 text-rose-400",
    )}>
      {isLong ? "▲ Long" : "▼ Short"}
    </span>
  );
}
