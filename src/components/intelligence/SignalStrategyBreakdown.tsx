import type { StrategyContribution } from "@/lib/intelligence/types";

function ScoreBar({ score, max = 40 }: { score: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  const isNeg = score < 0;
  const color = isNeg ? "bg-rose-400" : pct >= 60 ? "bg-emerald-400" : pct >= 35 ? "bg-sky-400" : "bg-white/30";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.abs(pct)}%` }} />
      </div>
      <span className={`text-[11px] tabular-nums font-semibold ${isNeg ? "text-rose-400" : "text-[#A7B4C8]"}`}>
        {score > 0 ? "+" : ""}{score}
      </span>
    </div>
  );
}

interface SignalStrategyBreakdownProps {
  contributions: StrategyContribution[];
  isStrategyLocked: boolean;
}

export function SignalStrategyBreakdown({ contributions, isStrategyLocked }: SignalStrategyBreakdownProps) {
  if (isStrategyLocked) {
    return (
      <div className="px-4 py-3 border-b border-white/[0.05]">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#70809A]">Strategy Analysis</div>
        <div className="rounded-xl border border-[#5B8CFF]/20 bg-[#5B8CFF]/5 px-3 py-2 text-[12px] text-[#70809A]">
          Multi-factor alignment detected — full breakdown is premium-only
        </div>
      </div>
    );
  }

  const totalPositive = contributions.filter((c) => c.weightedScore > 0).reduce((sum, c) => sum + c.weightedScore, 0);
  const totalNegative = contributions.filter((c) => c.weightedScore < 0).reduce((sum, c) => sum + c.weightedScore, 0);
  const netScore = totalPositive + totalNegative;
  const consensusLabel = netScore >= 60 ? "Strong Long Bias" : netScore >= 35 ? "Moderate Bullish" : netScore >= 0 ? "Marginal Bias" : "Conflicted";

  return (
    <div className="px-4 py-3 border-b border-white/[0.05]">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#70809A]">Strategy Breakdown</div>
      <div className="space-y-2 mb-3">
        {contributions.map((c, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] text-[#A7B4C8]">{c.strategyName}</span>
              {c.adminWeightApplied && (
                <span className="ml-1.5 text-[9px] text-violet-400">admin weighted</span>
              )}
            </div>
            <ScoreBar score={c.weightedScore} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
        <span className="text-[11px] text-[#70809A]">Composite Result</span>
        <span className="text-[12px] font-semibold text-[#F3F7FF]">{consensusLabel}</span>
      </div>
    </div>
  );
}
