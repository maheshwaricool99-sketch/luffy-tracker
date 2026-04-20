import { Card } from "@/components/ui/card";
import type { AiExplanation } from "@/lib/analysis/types";

type Props = { explanation: AiExplanation; entitlement: boolean };

export function AiExplanationCard({ explanation, entitlement }: Props) {
  return (
    <Card title="AI Explanation" subtitle={explanation.title}>
      <ul className="space-y-2 text-sm text-[var(--text-soft)]">
        {explanation.bullets.map((bullet, index) => (
          <li key={`${bullet}-${index}`} className="rounded-md border border-[var(--line)] px-3 py-2">{bullet}</li>
        ))}
      </ul>
      {!entitlement && explanation.totalBulletCount > explanation.bullets.length ? (
        <p className="mt-2 text-xs text-[var(--text-muted)]">+{explanation.totalBulletCount - explanation.bullets.length} more factors on Premium.</p>
      ) : null}
      <div className="mt-3 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
        <strong>Invalidation:</strong> {explanation.invalidation}
      </div>
    </Card>
  );
}
