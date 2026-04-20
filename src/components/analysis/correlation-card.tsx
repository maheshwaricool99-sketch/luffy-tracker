import { Card } from "@/components/ui/card";
import type { CorrelationMatrix, Market } from "@/lib/analysis/types";
import { formatPercent } from "@/lib/analysis/formatters";

type Props = {
  data: CorrelationMatrix | null;
  market: Market;
};

export function CorrelationCard({ data, market }: Props) {
  if (!data) {
    return (
      <Card title="Correlation" subtitle="Cross-market beta and regime tracking.">
        <p className="text-sm text-[var(--text-soft)]">Correlation data is currently unavailable.</p>
      </Card>
    );
  }

  return (
    <Card title="Correlation" subtitle={`Rolling 30d relationships for ${market} context.`}>
      <div className="space-y-2">
        {data.pairs.map((pair) => (
          <div key={`${pair.symbol}-${pair.period}`} className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] px-3 py-2">
            <div>
              <p className="text-sm font-medium text-[var(--text-strong)]">{pair.symbol}</p>
              <p className="text-xs text-[var(--text-soft)]">{pair.period}</p>
            </div>
            <p className="text-sm font-semibold text-[var(--text-strong)]">{formatPercent(pair.correlation * 100)}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] px-3 py-2">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Market Regime</p>
        <p className="mt-1 text-sm font-medium text-[var(--text-strong)]">
          {data.regime.label} · {data.regime.confidencePct}%
        </p>
        <p className="mt-1 text-xs text-[var(--text-soft)]">{data.regime.description}</p>
      </div>
    </Card>
  );
}
