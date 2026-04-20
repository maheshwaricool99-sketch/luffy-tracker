import type { SignalDrawerDto } from "@/lib/signals/types/signalDtos";
import { cn } from "@/lib/cn";

function ScoreBar({ score, color }: { score: number; color: string }) {
  const pct = Math.max(0, Math.min(10, score)) * 10;
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function TechnicalRow({ label, score }: { label: string; score: number }) {
  const color =
    score >= 8 ? "bg-emerald-500" :
    score >= 6 ? "bg-amber-500" :
    score >= 4 ? "bg-blue-500" :
    "bg-rose-500";
  const textColor =
    score >= 8 ? "text-emerald-400" :
    score >= 6 ? "text-amber-400" :
    score >= 4 ? "text-blue-400" :
    "text-rose-400";

  return (
    <div className="flex items-center gap-3">
      <span className="w-28 flex-shrink-0 text-[11px] text-[#70809A]">{label}</span>
      <div className="flex-1">
        <ScoreBar score={score} color={color} />
      </div>
      <span className={cn("w-6 text-right text-[11px] font-medium tabular-nums", textColor)}>
        {score.toFixed(0)}
      </span>
    </div>
  );
}

export function SignalReasonStack({ signal }: { signal: SignalDrawerDto }) {
  const { technicals, aiExplanationSimple, aiExplanationQuant, isPremiumLocked } = signal;
  const hasExplanation = aiExplanationSimple || aiExplanationQuant;
  const hasTechnicals = technicals && Object.values(technicals).some((v) => v != null);

  if (!hasTechnicals && !hasExplanation) return null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0B1728] p-4 md:p-5">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#70809A]">Signal Reasoning</h3>

      {hasExplanation && !isPremiumLocked && (
        <div className="mb-4 space-y-2">
          {aiExplanationSimple && (
            <p className="text-[13px] leading-relaxed text-[#A7B4C8]">{aiExplanationSimple}</p>
          )}
          {aiExplanationQuant && (
            <p className="text-[12px] leading-relaxed text-[#70809A]">{aiExplanationQuant}</p>
          )}
        </div>
      )}
      {hasExplanation && isPremiumLocked && (
        <div className="mb-4 rounded-xl border border-amber-400/10 bg-amber-400/[0.04] p-3">
          <p className="text-[12px] text-amber-400/80">Detailed AI reasoning is available on Premium.</p>
        </div>
      )}

      {hasTechnicals && (
        <div className="space-y-2.5">
          {technicals!.liquidityScore != null && (
            <TechnicalRow label="Liquidity" score={technicals!.liquidityScore} />
          )}
          {technicals!.volumeScore != null && (
            <TechnicalRow label="Volume" score={technicals!.volumeScore} />
          )}
          {technicals!.momentumScore != null && (
            <TechnicalRow label="Momentum" score={technicals!.momentumScore} />
          )}
          {technicals!.structureScore != null && (
            <TechnicalRow label="Structure" score={technicals!.structureScore} />
          )}
          {technicals!.derivativesScore != null && (
            <TechnicalRow label="Derivatives" score={technicals!.derivativesScore} />
          )}
        </div>
      )}
    </div>
  );
}
