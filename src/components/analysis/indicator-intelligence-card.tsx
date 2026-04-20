import { Card } from "@/components/ui/card";
import type { IndicatorSignal } from "@/lib/analysis/types";

type Props = { indicators: IndicatorSignal[] };

export function IndicatorIntelligenceCard({ indicators }: Props) {
  return (
    <Card title="Indicator Intelligence" subtitle="Signal-level indicator votes and strength classification.">
      <div className="space-y-2">
        {indicators.map((indicator) => (
          <div key={indicator.name} className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{indicator.name}</span>
              <span className="text-xs text-[var(--text-muted)]">{indicator.strength}</span>
            </div>
            <p className="text-xs text-[var(--text-soft)]">{indicator.signal}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
