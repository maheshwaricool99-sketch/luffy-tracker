import { Card } from "@/components/ui/card";
import type { DecisionEngine } from "@/lib/analysis/types";
import { VERDICT_LABELS, VERDICT_TONES } from "@/lib/analysis/constants";

type Props = { decision: DecisionEngine };

export function DecisionEngineCard({ decision }: Props) {
  const entries = Object.entries(decision.confidenceBreakdown);
  return (
    <Card title="Decision Engine" subtitle="AI aggregate verdict with weighted confidence inputs.">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <p className={`text-3xl font-semibold ${VERDICT_TONES[decision.verdict]}`}>{VERDICT_LABELS[decision.verdict]}</p>
          <p className="text-sm text-[var(--text-soft)]">{decision.summary}</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border border-[var(--line)] p-3"><p className="text-xs text-[var(--text-muted)]">Confidence</p><p className="text-lg font-semibold">{decision.confidencePct}%</p></div>
            <div className="rounded-lg border border-[var(--line)] p-3"><p className="text-xs text-[var(--text-muted)]">Final Score</p><p className="text-lg font-semibold">{decision.finalScore.toFixed(1)}/10</p></div>
            <div className="rounded-lg border border-[var(--line)] p-3"><p className="text-xs text-[var(--text-muted)]">Risk Grade</p><p className="text-lg font-semibold">{decision.riskGrade}</p></div>
            <div className="rounded-lg border border-[var(--line)] p-3"><p className="text-xs text-[var(--text-muted)]">Horizon</p><p className="text-lg font-semibold">{decision.timeHorizon}</p></div>
          </div>
        </div>
        <div className="space-y-2">
          {entries.map(([name, value]) => (
            <div key={name}>
              <div className="mb-1 flex items-center justify-between text-xs text-[var(--text-soft)]"><span className="capitalize">{name}</span><span>{value}%</span></div>
              <div className="h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.max(4, Math.min(100, value))}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
