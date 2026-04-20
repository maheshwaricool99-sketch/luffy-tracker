import type {
  IntelligenceSignalStatus,
  QualityGrade,
  SignalActionability,
  RiskGrade,
  IntegrityStatus,
} from "@/lib/intelligence/types";
import type { SignalDirection } from "@/lib/signals/types/signalEnums";
import { cn } from "@/lib/cn";

function Pill({ label, className }: { label: string; className: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", className)}>
      {label}
    </span>
  );
}

export function DirectionBadge({ direction }: { direction: SignalDirection }) {
  return (
    <Pill
      label={direction}
      className={direction === "LONG"
        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
        : "border-rose-500/30 bg-rose-500/15 text-rose-300"}
    />
  );
}

export function StatusBadge({ status }: { status: IntelligenceSignalStatus }) {
  const map: Record<IntelligenceSignalStatus, string> = {
    ACTIVE:    "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    READY:     "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    TRIGGERED: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    EARLY:     "border-violet-400/30 bg-violet-400/10 text-violet-300",
    WATCHLIST: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    EXTENDED:  "border-amber-400/30 bg-amber-400/10 text-amber-300",
    STALE:     "border-white/10 bg-white/5 text-[#70809A]",
    EXPIRED:   "border-white/10 bg-white/5 text-[#70809A]",
    BLOCKED:   "border-rose-400/30 bg-rose-400/10 text-rose-400",
    REVIEW:    "border-violet-400/30 bg-violet-400/10 text-violet-400",
  };
  return <Pill label={status} className={map[status] ?? "border-white/10 bg-white/5 text-[#A7B4C8]"} />;
}

export function QualityBadge({ grade }: { grade: QualityGrade }) {
  const map: Record<QualityGrade, string> = {
    ELITE:      "border-amber-400/40 bg-amber-400/15 text-amber-300",
    STRONG:     "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    GOOD:       "border-sky-400/30 bg-sky-400/10 text-sky-300",
    WATCH_ONLY: "border-amber-400/20 bg-amber-400/8 text-amber-400/80",
    SPECULATIVE:"border-rose-400/20 bg-rose-400/8 text-rose-400/80",
    AVOID:      "border-white/10 bg-white/5 text-[#70809A]",
  };
  const labels: Record<QualityGrade, string> = {
    ELITE: "Elite", STRONG: "Strong", GOOD: "Good",
    WATCH_ONLY: "Watch Only", SPECULATIVE: "Speculative", AVOID: "Avoid",
  };
  return <Pill label={labels[grade]} className={map[grade]} />;
}

export function ActionabilityBadge({ actionability }: { actionability: SignalActionability }) {
  const map: Record<SignalActionability, { label: string; cls: string }> = {
    READY_NOW:         { label: "Ready Now",       cls: "border-emerald-400/40 bg-emerald-400/15 text-emerald-300" },
    WAIT_FOR_TRIGGER:  { label: "Wait for Trigger",cls: "border-sky-400/30 bg-sky-400/10 text-sky-300" },
    WATCH_RETEST:      { label: "Watch Retest",    cls: "border-amber-400/30 bg-amber-400/10 text-amber-300" },
    TOO_EXTENDED:      { label: "Too Extended",    cls: "border-rose-400/30 bg-rose-400/10 text-rose-400" },
    INFORMATIONAL_ONLY:{ label: "Info Only",       cls: "border-white/10 bg-white/5 text-[#70809A]" },
  };
  const { label, cls } = map[actionability];
  return <Pill label={label} className={cls} />;
}

export function RiskBadge({ grade }: { grade: RiskGrade }) {
  const map: Record<RiskGrade, string> = {
    LOW:        "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    MEDIUM:     "border-amber-400/30 bg-amber-400/10 text-amber-300",
    HIGH:       "border-rose-400/30 bg-rose-400/10 text-rose-300",
    SPECULATIVE:"border-rose-500/40 bg-rose-500/15 text-rose-300",
  };
  return <Pill label={grade} className={map[grade]} />;
}

export function IntegrityBadge({ status }: { status: IntegrityStatus }) {
  const map: Record<IntegrityStatus, string> = {
    VERIFIED:        "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    LIVE:            "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
    DELAYED:         "border-amber-400/30 bg-amber-400/10 text-amber-300",
    PARTIAL:         "border-amber-400/20 bg-amber-400/8 text-amber-400",
    DEGRADED:        "border-rose-400/30 bg-rose-400/10 text-rose-300",
    MISMATCHED:      "border-rose-400/40 bg-rose-400/15 text-rose-300",
    UNTRUSTED:       "border-rose-500/50 bg-rose-500/20 text-rose-200",
    SCANNER_ONLY:    "border-white/10 bg-white/5 text-[#A7B4C8]",
    REVIEW_REQUIRED: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  };
  const labels: Record<IntegrityStatus, string> = {
    VERIFIED: "Verified", LIVE: "Live", DELAYED: "Delayed",
    PARTIAL: "Partial", DEGRADED: "Degraded", MISMATCHED: "Mismatched",
    UNTRUSTED: "Untrusted", SCANNER_ONLY: "Scanner Only", REVIEW_REQUIRED: "Review Req.",
  };
  return <Pill label={labels[status]} className={map[status]} />;
}

export function MarketBadge({ market }: { market: string }) {
  const map: Record<string, string> = {
    CRYPTO: "border-violet-400/30 bg-violet-400/10 text-violet-300",
    US:     "border-sky-400/30 bg-sky-400/10 text-sky-300",
    INDIA:  "border-amber-400/30 bg-amber-400/10 text-amber-300",
  };
  const labels: Record<string, string> = { CRYPTO: "Crypto", US: "US Equities", INDIA: "India" };
  const cls = map[market] ?? "border-white/10 bg-white/5 text-[#A7B4C8]";
  return <Pill label={labels[market] ?? market} className={cls} />;
}

export function FreshnessChip({ freshnessMs }: { freshnessMs: number }) {
  const sec = Math.round(freshnessMs / 1000);
  const isLive = sec < 10;
  const isFresh = sec < 120;
  const label = isLive ? "Live" : sec < 60 ? `${sec}s ago` : sec < 3600 ? `${Math.round(sec / 60)}m ago` : `${Math.round(sec / 3600)}h ago`;
  const cls = isLive
    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200 animate-pulse"
    : isFresh
    ? "border-emerald-400/20 bg-emerald-400/8 text-emerald-400"
    : "border-amber-400/20 bg-amber-400/8 text-amber-400";
  return <Pill label={label} className={cls} />;
}
