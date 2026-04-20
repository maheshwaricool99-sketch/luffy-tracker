import { Card } from "@/components/ui/card";
import type { PatternMatch } from "@/lib/analysis/types";

type Props = { patterns: PatternMatch[] };

export function PatternRecognitionCard({ patterns }: Props) {
  return (
    <Card title="Pattern Recognition" subtitle="Detected pattern context with historical behavior references.">
      <div className="space-y-2">
        {patterns.map((pattern) => (
          <div key={pattern.name} className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm">
            <div className="mb-1 flex items-center justify-between"><span className="font-medium">{pattern.name}</span><span className="text-xs text-[var(--text-muted)]">{pattern.status}</span></div>
            <p className="text-xs text-[var(--text-soft)]">{pattern.description}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Win rate {pattern.historicalWinRatePct ?? "—"}% · n={pattern.sampleSize ?? "—"}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
