import type { SignalStatus } from "@/lib/signals/types/signalEnums";
import { cn } from "@/lib/cn";

const STATUS_STYLES: Record<SignalStatus, string> = {
  DETECTED: "border-slate-500/30 bg-slate-500/12 text-slate-400",
  VALIDATED: "border-blue-500/30 bg-blue-500/12 text-blue-400",
  PUBLISHED: "border-emerald-500/30 bg-emerald-500/12 text-emerald-400",
  TRIGGERED: "border-cyan-500/30 bg-cyan-500/12 text-cyan-400",
  CLOSED_TP: "border-emerald-500/20 bg-emerald-500/08 text-emerald-500/70",
  CLOSED_SL: "border-rose-500/20 bg-rose-500/08 text-rose-500/70",
  EXPIRED: "border-slate-500/20 bg-transparent text-slate-500",
  INVALIDATED: "border-slate-500/20 bg-transparent text-slate-500",
  REJECTED: "border-slate-500/20 bg-transparent text-slate-500",
  UNPUBLISHED: "border-amber-500/20 bg-amber-500/08 text-amber-500/70",
};

const STATUS_LABELS: Record<SignalStatus, string> = {
  DETECTED: "Detected",
  VALIDATED: "Validated",
  PUBLISHED: "Active",
  TRIGGERED: "Triggered",
  CLOSED_TP: "Won",
  CLOSED_SL: "Stopped",
  EXPIRED: "Expired",
  INVALIDATED: "Invalidated",
  REJECTED: "Rejected",
  UNPUBLISHED: "Unpublished",
};

export function StatusPill({ status, size = "sm" }: { status: SignalStatus; size?: "xs" | "sm" }) {
  const sizeClass = size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]";
  return (
    <span className={cn("inline-flex items-center rounded-full border font-medium", sizeClass, STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}
