import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { SignalDirection } from "@/lib/signals/types/signalEnums";
import type { IntegrityStatus, IntelligenceSignalStatus } from "@/lib/intelligence/types";

interface SignalCardShellProps {
  direction: SignalDirection;
  status: IntelligenceSignalStatus;
  integrityStatus: IntegrityStatus;
  isPremiumGrade: boolean;
  isAdminAdjusted: boolean;
  isPremiumLocked: boolean;
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

export function SignalCardShell({
  direction,
  status,
  integrityStatus,
  isPremiumGrade,
  isAdminAdjusted,
  isPremiumLocked,
  selected,
  onClick,
  children,
}: SignalCardShellProps) {
  const isStale = status === "STALE" || status === "EXPIRED";
  const isBroken = integrityStatus === "UNTRUSTED" || integrityStatus === "MISMATCHED";
  const isLong = direction === "LONG";

  const borderClass = isAdminAdjusted
    ? "border-violet-500/40"
    : isBroken
    ? "border-rose-500/40"
    : isStale
    ? "border-amber-400/25"
    : isPremiumLocked
    ? "border-white/[0.05]"
    : isPremiumGrade
    ? isLong
      ? "border-emerald-500/30"
      : "border-rose-500/30"
    : "border-white/[0.08]";

  const glowClass = !isStale && !isBroken && !isPremiumLocked && isPremiumGrade
    ? isLong
      ? "shadow-[0_0_24px_rgba(52,211,153,0.06)]"
      : "shadow-[0_4px_24px_rgba(239,68,68,0.06)]"
    : "shadow-[0_4px_16px_rgba(0,0,0,0.3)]";

  const accentBar = !isPremiumLocked && !isStale && !isBroken
    ? isLong
      ? "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:rounded-l-2xl before:bg-emerald-500/60"
      : "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:rounded-l-2xl before:bg-rose-500/60"
    : isStale
    ? "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:rounded-l-2xl before:bg-amber-400/40"
    : "";

  return (
    <article
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-[#0B1728] transition-all duration-150",
        "cursor-pointer select-none",
        borderClass,
        glowClass,
        accentBar,
        selected && "ring-2 ring-[#5B8CFF]/40 ring-offset-1 ring-offset-[#06111F]",
        isPremiumLocked && "opacity-80",
        onClick && "hover:bg-[#0D1E34] hover:-translate-y-[1px] hover:shadow-[0_8px_28px_rgba(0,0,0,0.4)]",
      )}
    >
      {isAdminAdjusted && (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded border border-violet-500/40 bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-300">
          Admin Override
        </div>
      )}
      {children}
    </article>
  );
}
