import { Card } from "@/components/ui/card";
import type { RiskAnalysis } from "@/lib/analysis/types";
import { formatPercent } from "@/lib/analysis/formatters";

type Props = {
  risk: RiskAnalysis;
};

function tone(level: "LOW" | "MEDIUM" | "HIGH") {
  if (level === "LOW") return "text-emerald-300";
  if (level === "HIGH") return "text-rose-300";
  return "text-amber-300";
}

export function RiskAnalysisCard({ risk }: Props) {
  return (
    <Card title="Risk Analysis" subtitle="Probability, drawdown, event sensitivity, and sizing guardrails.">
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] p-2.5">
            <p className="text-xs text-[var(--text-soft)]">Success Prob.</p>
            <p className="text-base font-semibold text-[var(--text-strong)]">{risk.probabilityOfSuccessPct ?? "—"}%</p>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] p-2.5">
            <p className="text-xs text-[var(--text-soft)]">Max Drawdown</p>
            <p className="text-base font-semibold text-[var(--text-strong)]">{risk.maxDrawdownPct != null ? formatPercent(risk.maxDrawdownPct) : "—"}</p>
          </div>
        </div>

        <div className="space-y-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] px-3 py-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-soft)]">Volatility</span>
            <span className={tone(risk.volatilityRisk)}>{risk.volatilityRisk}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-soft)]">News Risk</span>
            <span className={tone(risk.newsRisk)}>{risk.newsRisk}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-soft)]">Event Risk</span>
            <span className={tone(risk.eventRisk)}>{risk.eventRisk}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-soft)]">Correlation Risk</span>
            <span className={tone(risk.correlationRisk)}>{risk.correlationRisk}</span>
          </div>
        </div>

        {risk.notes.length > 0 ? (
          <ul className="space-y-1 text-xs text-[var(--text-soft)]">
            {risk.notes.slice(0, 3).map((note) => (
              <li key={note}>• {note}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </Card>
  );
}
