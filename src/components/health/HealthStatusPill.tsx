import type { HealthStatus, MarketStatus, ComponentStatus, ProviderHealthStatus, IncidentSeverity } from "@/lib/health/health-types";
import { cn } from "@/lib/cn";

type StatusVariant = HealthStatus | MarketStatus | ComponentStatus | ProviderHealthStatus | IncidentSeverity | "fresh" | "delayed" | "stale" | "enabled" | "disabled";

const VARIANT_CLASSES: Record<string, string> = {
  operational: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  live: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  healthy: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  active: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  fresh: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  enabled: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  info: "border-blue-500/30 bg-blue-500/15 text-blue-400",

  degraded: "border-amber-500/30 bg-amber-500/15 text-amber-400",
  snapshot: "border-amber-500/30 bg-amber-500/15 text-amber-400",
  delayed: "border-amber-500/30 bg-amber-500/15 text-amber-400",
  fallback: "border-amber-500/30 bg-amber-500/15 text-amber-400",
  warning: "border-amber-500/30 bg-amber-500/15 text-amber-400",

  partial_outage: "border-orange-500/30 bg-orange-500/15 text-orange-400",
  reconnecting: "border-orange-500/30 bg-orange-500/15 text-orange-400",
  rate_limited: "border-orange-500/30 bg-orange-500/15 text-orange-400",
  paused: "border-sky-500/30 bg-sky-500/15 text-sky-300",

  down: "border-rose-500/30 bg-rose-500/15 text-rose-400",
  blocked: "border-rose-500/30 bg-rose-500/15 text-rose-400",
  stale: "border-rose-500/30 bg-rose-500/15 text-rose-400",
  critical: "border-rose-500/30 bg-rose-500/15 text-rose-400",

  disabled: "border-slate-500/30 bg-slate-500/15 text-slate-400",
  use_caution: "border-amber-500/30 bg-amber-500/15 text-amber-400",
  not_reliable: "border-rose-500/30 bg-rose-500/15 text-rose-400",
  high_confidence: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
};

const STATUS_LABELS: Record<string, string> = {
  operational: "Operational",
  degraded: "Degraded",
  partial_outage: "Partial Outage",
  down: "Down",
  live: "Live",
  snapshot: "Snapshot",
  blocked: "Blocked",
  healthy: "Healthy",
  reconnecting: "Reconnecting",
  paused: "Paused",
  disabled: "Disabled",
  rate_limited: "Rate Limited",
  fallback: "Fallback",
  active: "Active",
  down_status: "Down",
  fresh: "Fresh",
  delayed: "Delayed",
  stale: "Stale",
  enabled: "Enabled",
  high_confidence: "High Confidence",
  use_caution: "Use Caution",
  not_reliable: "Not Reliable",
};

const STATUS_DOTS: Record<string, string> = {
  operational: "bg-emerald-400",
  live: "bg-emerald-400",
  healthy: "bg-emerald-400",
  fresh: "bg-emerald-400",
  active: "bg-emerald-400",
  enabled: "bg-emerald-400",
  degraded: "bg-amber-400",
  snapshot: "bg-amber-400",
  delayed: "bg-amber-400",
  fallback: "bg-amber-400",
  partial_outage: "bg-orange-400 animate-pulse",
  reconnecting: "bg-orange-400 animate-pulse",
  rate_limited: "bg-orange-400",
  paused: "bg-sky-300",
  down: "bg-rose-400",
  blocked: "bg-rose-400",
  stale: "bg-rose-400",
  disabled: "bg-slate-500",
};

export function HealthStatusPill({
  status,
  label,
  className,
  showDot = true,
  size = "sm",
}: {
  status: StatusVariant | string;
  label?: string;
  className?: string;
  showDot?: boolean;
  size?: "xs" | "sm" | "md";
}) {
  const variantClass = VARIANT_CLASSES[status] ?? "border-slate-500/30 bg-slate-500/15 text-slate-400";
  const dotClass = STATUS_DOTS[status] ?? "bg-slate-400";
  const displayLabel = label ?? STATUS_LABELS[status] ?? status;

  const sizeClass =
    size === "xs" ? "px-1.5 py-0.5 text-[10px]" :
    size === "md" ? "px-3 py-1.5 text-[13px]" :
    "px-2 py-1 text-[11px]";

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border font-medium", sizeClass, variantClass, className)}>
      {showDot && <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", dotClass)} />}
      {displayLabel}
    </span>
  );
}
