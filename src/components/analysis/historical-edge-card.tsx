import { Card } from "@/components/ui/card";
import type { HistoricalEdge } from "@/lib/analysis/types";

type Props = {
  edge: HistoricalEdge | null;
  entitlement: boolean;
};

function OutcomePill({ outcome }: { outcome: "WIN" | "LOSS" | "BREAKEVEN" }) {
  const tone = outcome === "WIN"
    ? "bg-emerald-400/20 border-emerald-400/30 text-emerald-200"
    : outcome === "LOSS"
      ? "bg-rose-400/20 border-rose-400/30 text-rose-200"
      : "bg-slate-400/20 border-slate-400/30 text-slate-200";
  return <span className={`inline-flex h-5 w-5 items-center justify-center rounded border text-[10px] font-semibold ${tone}`}>{outcome[0]}</span>;
}

export function HistoricalEdgeCard({ edge, entitlement }: Props) {
  if (!entitlement || !edge) {
    return (
      <Card title="Historical Edge" subtitle="Backtest-derived expectancy and recent outcomes.">
        <p className="text-sm text-[var(--text-soft)]">Upgrade to unlock historical edge and expectancy diagnostics.</p>
      </Card>
    );
  }

  return (
    <Card title="Historical Edge" subtitle={edge.sampleSizeLabel}>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] p-2.5">
          <p className="text-xs text-[var(--text-soft)]">Win Rate</p>
          <p className="text-base font-semibold text-[var(--text-strong)]">{edge.winRatePct ?? "—"}%</p>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] p-2.5">
          <p className="text-xs text-[var(--text-soft)]">Expectancy</p>
          <p className="text-base font-semibold text-[var(--text-strong)]">{edge.expectancyR.toFixed(2)}R</p>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] p-2.5">
          <p className="text-xs text-[var(--text-soft)]">Avg R:R</p>
          <p className="text-base font-semibold text-[var(--text-strong)]">{edge.avgRiskReward?.toFixed(2) ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] p-2.5">
          <p className="text-xs text-[var(--text-soft)]">Cum Return</p>
          <p className="text-base font-semibold text-[var(--text-strong)]">{edge.cumulativeReturnPct.toFixed(1)}%</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {edge.last20Outcomes.map((outcome, index) => (
          <OutcomePill key={`${outcome}-${index}`} outcome={outcome} />
        ))}
      </div>
    </Card>
  );
}
