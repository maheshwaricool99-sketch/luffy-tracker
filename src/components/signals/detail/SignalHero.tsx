import type { SignalDrawerDto } from "@/lib/signals/types/signalDtos";
import { DirectionPill } from "../shared/DirectionPill";
import { ConfidencePill } from "../shared/ConfidencePill";
import { FreshnessPill } from "../shared/FreshnessPill";
import { StatusPill } from "../shared/StatusPill";
import { cn } from "@/lib/cn";

const MARKET_LABELS: Record<string, string> = {
  CRYPTO: "Crypto",
  US: "US Equities",
  INDIA: "India Equities",
};

function formatPrice(price: number): string {
  if (price < 1) return `$${price.toFixed(5)}`;
  if (price < 100) return `$${price.toFixed(3)}`;
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ScoreRing({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const r = 20;
  const circ = 2 * Math.PI * r;
  const color = score >= 8 ? "#10b981" : score >= 6 ? "#f59e0b" : "#f43f5e";
  return (
    <div className="relative flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center">
      <svg className="-rotate-90" width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} />
      </svg>
      <span className={cn("absolute text-[11px] font-bold tabular-nums", score >= 8 ? "text-emerald-400" : score >= 6 ? "text-amber-400" : "text-rose-400")}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

export function SignalHero({ signal }: { signal: SignalDrawerDto }) {
  const isLocked = signal.isPremiumLocked;
  const thesis = signal.rationaleFull ?? signal.rationaleSnippet;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0B1728] p-4 md:p-5">
      {/* Symbol row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[22px] font-bold text-[#F3F7FF]">{signal.symbol}</span>
            {signal.assetName && (
              <span className="text-[13px] text-[#70809A]">{signal.assetName}</span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <DirectionPill direction={signal.direction} />
            <ConfidencePill bucket={signal.confidenceBucket} score={signal.confidenceScore} />
            <StatusPill status={signal.status} />
            <FreshnessPill badge={signal.freshness.badge} ageSeconds={signal.freshness.ageSeconds} isDelayed={signal.freshness.isDelayed} />
          </div>
        </div>
        {signal.confidenceScore != null && (
          <ScoreRing score={signal.confidenceScore / 10} />
        )}
      </div>

      {/* Meta row */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#70809A]">
        <span>{MARKET_LABELS[signal.market] ?? signal.market}</span>
        <span>·</span>
        <span>{formatPrice(signal.currentPrice)}</span>
        {signal.percentChange != null && (
          <span className={signal.percentChange > 0 ? "text-emerald-400" : "text-rose-400"}>
            {signal.percentChange > 0 ? "+" : ""}{signal.percentChange.toFixed(2)}%
          </span>
        )}
        {signal.timeframe && <span>· {signal.timeframe}</span>}
        {isLocked && (
          <span className="ml-auto flex items-center gap-1 text-amber-400/80">
            <span className="text-[10px]">🔒</span>
            <span>Premium plan</span>
          </span>
        )}
      </div>

      {/* Thesis */}
      {thesis && (
        <p className={cn(
          "mt-3 text-[13px] leading-relaxed",
          isLocked ? "text-[#70809A]" : "text-[#A7B4C8]",
        )}>
          {thesis}
        </p>
      )}
    </div>
  );
}
