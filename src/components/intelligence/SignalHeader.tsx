import type { IntelligenceSignal } from "@/lib/intelligence/types";
import { DirectionBadge, MarketBadge, StatusBadge, QualityBadge, FreshnessChip } from "./SignalBadges";

interface SignalHeaderProps {
  signal: IntelligenceSignal;
}

function SetupTypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    BREAKOUT: "BRK", REVERSAL: "REV", MOMENTUM: "MOM",
    MEAN_REVERSION: "MR", TREND_CONTINUATION: "CONT", VOLATILITY_EXPANSION: "VOL",
  };
  return (
    <span className="inline-flex items-center rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#70809A]">
      {labels[type] ?? type}
    </span>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 8 ? "text-amber-300" : score >= 6.5 ? "text-emerald-300" : score >= 5 ? "text-sky-300" : "text-[#70809A]";
  return (
    <div className="flex flex-col items-end">
      <span className={`text-[22px] font-bold tabular-nums leading-none ${color}`}>
        {score.toFixed(1)}
      </span>
      <span className="text-[10px] text-[#70809A]">/ 10</span>
    </div>
  );
}

export function SignalHeader({ signal }: SignalHeaderProps) {
  const strategyCount = signal.strategyContributions.filter((s) => s.enabledAtPublish).length;

  return (
    <div className="px-4 pt-4 pb-3 border-b border-white/[0.05]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[18px] font-bold tracking-tight text-[#F3F7FF]">{signal.symbol}</span>
            <DirectionBadge direction={signal.direction} />
            <MarketBadge market={signal.market} />
            {strategyCount > 1 && (
              <span className="inline-flex items-center rounded border border-[#5B8CFF]/25 bg-[#5B8CFF]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#89A8FF]">
                {strategyCount} strategies
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <SetupTypeBadge type={signal.setupType} />
            <FreshnessChip freshnessMs={signal.feedMeta.freshnessMs} />
            <StatusBadge status={signal.status} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <ScoreRing score={signal.finalRankScore} />
          {!signal.isPremiumLocked && (
            <QualityBadge grade={signal.qualityGrade} />
          )}
        </div>
      </div>

      {!signal.isPremiumLocked && (
        <div className="mt-2.5 flex items-center gap-1 text-[11px] text-[#70809A]">
          <span>Confidence</span>
          <div className="ml-1 flex-1 h-1 max-w-[80px] rounded-full bg-white/[0.06]">
            <div
              className={`h-full rounded-full ${signal.confidence >= 80 ? "bg-emerald-400" : signal.confidence >= 65 ? "bg-sky-400" : signal.confidence >= 50 ? "bg-amber-400" : "bg-white/30"}`}
              style={{ width: `${signal.confidence}%` }}
            />
          </div>
          <span className="tabular-nums text-[#A7B4C8] font-semibold">{signal.confidence}%</span>
        </div>
      )}

      {signal.assetName && (
        <div className="mt-1 text-[11px] text-[#70809A]">{signal.assetName}</div>
      )}
    </div>
  );
}
