import { memo } from "react";
import type { SignalListItemDto } from "@/lib/signals/types/signalDtos";
import { DirectionPill } from "./shared/DirectionPill";
import { ConfidencePill } from "./shared/ConfidencePill";
import { FreshnessPill } from "./shared/FreshnessPill";
import { StatusPill } from "./shared/StatusPill";
import { cn } from "@/lib/cn";

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  BREAKOUT: "Breakout",
  REVERSAL: "Reversal",
  MOMENTUM: "Momentum",
  MEAN_REVERSION: "Mean Rev.",
  TREND_CONTINUATION: "Trend",
  VOLATILITY_EXPANSION: "Volatility",
};

const MARKET_LABELS: Record<string, string> = {
  CRYPTO: "Crypto",
  US: "US",
  INDIA: "India",
};

function formatPrice(price: number): string {
  if (price < 1) return `$${price.toFixed(5)}`;
  if (price < 100) return `$${price.toFixed(3)}`;
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SignalCardComponent({
  signal,
  role,
  selected,
  onSelect,
}: {
  signal: SignalListItemDto;
  role?: string;
  selected?: boolean;
  onSelect: () => void;
}) {
  const isLong = signal.direction === "LONG";
  const isLocked = signal.isPremiumLocked;
  const isGuest = role === "GUEST";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group w-full rounded-2xl border p-3 text-left transition-all duration-150",
        "focus:outline-none focus:ring-2 focus:ring-[#5B8CFF]/40",
        selected && isLong && "border-emerald-500/40 bg-emerald-500/[0.03] shadow-[0_0_24px_rgba(16,185,129,0.07)]",
        selected && !isLong && "border-rose-500/40 bg-rose-500/[0.03] shadow-[0_0_24px_rgba(244,63,94,0.07)]",
        !selected && "border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]",
      )}
    >
      <div className="flex min-h-[116px] flex-col justify-between gap-1.5">
        {/* Row 1 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[15px] font-bold text-[#F3F7FF]">{signal.symbol}</span>
            <DirectionPill direction={signal.direction} />
            <ConfidencePill bucket={signal.confidenceBucket} score={signal.confidenceScore} />
          </div>
          <FreshnessPill badge={signal.freshness.badge} ageSeconds={signal.freshness.ageSeconds} isDelayed={signal.freshness.isDelayed} size="xs" />
        </div>

        {/* Row 2: meta */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#70809A]">
          <span>{MARKET_LABELS[signal.market] ?? signal.market}</span>
          <span>·</span>
          <span>{SIGNAL_TYPE_LABELS[signal.signalType] ?? signal.signalType}</span>
          <span>·</span>
          <StatusPill status={signal.status} size="xs" />
        </div>

        {/* Row 3: thesis */}
        <p className="line-clamp-1 text-[12px] text-[#A7B4C8]">
          {signal.rationaleSnippet ?? `${isLong ? "Bullish" : "Bearish"} setup · ${SIGNAL_TYPE_LABELS[signal.signalType] ?? signal.signalType}`}
        </p>

        {/* Row 4: plan preview */}
        <div className="flex items-center gap-3 text-[11px]">
          {isLocked ? (
            <LockedPreview isGuest={isGuest} />
          ) : (
            <>
              {signal.entry?.min != null && (
                <PlanItem label="Entry" value={
                  signal.entry.max != null
                    ? `${formatPrice(signal.entry.min)}–${formatPrice(signal.entry.max)}`
                    : formatPrice(signal.entry.min)
                } />
              )}
              {signal.stopLoss?.value != null && (
                <PlanItem label="SL" value={formatPrice(signal.stopLoss.value)} className="text-rose-400/80" />
              )}
              {signal.targets?.tp1 != null && (
                <PlanItem label="T1" value={formatPrice(signal.targets.tp1)} className="text-emerald-400/80" />
              )}
            </>
          )}
        </div>

        {/* Row 5: footer */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-[#70809A]">
          <span className="tabular-nums">{formatPrice(signal.currentPrice)}</span>
          {signal.timeframe && <span>{signal.timeframe}</span>}
          {signal.freshness.ageSeconds != null && (
            <span>
              {signal.freshness.ageSeconds < 60
                ? `${signal.freshness.ageSeconds}s ago`
                : signal.freshness.ageSeconds < 3600
                ? `${Math.floor(signal.freshness.ageSeconds / 60)}m ago`
                : `${Math.floor(signal.freshness.ageSeconds / 3600)}h ago`}
            </span>
          )}
          {signal.isWatchlisted && <span className="text-[#5B8CFF]">★</span>}
        </div>
      </div>
    </button>
  );
}

function PlanItem({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <span className="flex items-center gap-0.5">
      <span className="text-[#70809A]">{label}</span>
      <span className={cn("font-medium text-[#A7B4C8]", className)}>{value}</span>
    </span>
  );
}

function LockedShape({ label }: { label: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-[#4A5568]">{label}</span>
      <span className="select-none text-[#70809A]/70 blur-[3.5px] tabular-nums" aria-hidden>
        00.000
      </span>
    </span>
  );
}

function LockedPreview({ isGuest }: { isGuest: boolean }) {
  return (
    <span className="flex w-full items-center justify-between gap-2">
      <span className="flex items-center gap-2">
        <LockedShape label="Entry" />
        <LockedShape label="SL" />
        <LockedShape label="T1" />
      </span>
      <span className="rounded-md border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
        {isGuest ? "Sign in" : "Unlock"}
      </span>
    </span>
  );
}

export const SignalCard = memo(SignalCardComponent);
