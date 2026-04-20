import { Card } from "@/components/ui/card";
import type { ScenarioOutcomes } from "@/lib/analysis/types";
import { formatPercent, formatPrice } from "@/lib/analysis/formatters";

type Props = { scenarios: ScenarioOutcomes | null };

export function ScenarioCard({ scenarios }: Props) {
  return (
    <Card title="Scenario Outcomes" subtitle="Probabilistic paths based on current structure and volatility regime.">
      {!scenarios ? <p className="text-sm text-[var(--text-soft)]">Scenario modeling requires Premium.</p> : (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {scenarios.scenarios.map((scenario) => (
              <div key={scenario.label} className="rounded-lg border border-[var(--line)] p-3 text-sm">
                <p className="font-semibold">{scenario.label}</p>
                <p className="text-xs text-[var(--text-muted)]">{scenario.probabilityPct}% probability</p>
                <p className="text-[var(--text-soft)]">{formatPrice(scenario.targetPrice)} · {formatPercent(scenario.changePct)}</p>
              </div>
            ))}
          </div>
          <div className="h-24 rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] p-2">
            <div className="flex h-full items-end gap-1">
              {scenarios.distributionHistogram.map((bucket) => (
                <div key={bucket.priceBucket} className="flex-1 rounded-t bg-sky-400/40" style={{ height: `${Math.max(8, bucket.probabilityPct * 1.8)}%` }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
