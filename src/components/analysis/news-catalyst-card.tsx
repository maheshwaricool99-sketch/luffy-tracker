import { Card } from "@/components/ui/card";
import type { NewsAndCatalysts } from "@/lib/analysis/types";
import { formatRelativeTime } from "@/lib/analysis/formatters";

type Props = { data: NewsAndCatalysts | null };

export function NewsCatalystCard({ data }: Props) {
  return (
    <Card title="News & Catalysts" subtitle="Recent headlines and scheduled catalyst windows.">
      {!data ? <p className="text-sm text-[var(--text-soft)]">No catalyst feed currently available.</p> : (
        <div className="space-y-3">
          <div className="space-y-1">
            {data.news.slice(0, 3).map((item) => (
              <article key={item.id} className="rounded-md border border-[var(--line)] px-3 py-2 text-xs">
                <p className="font-medium text-[var(--text-strong)]">{item.headline}</p>
                <p className="text-[var(--text-muted)]">{item.source} · {formatRelativeTime(item.publishedAt)}</p>
              </article>
            ))}
          </div>
          <div className="space-y-1">
            {data.catalysts.slice(0, 2).map((item) => (
              <div key={item.id} className="rounded-md border border-[var(--line)] px-3 py-2 text-xs text-[var(--text-soft)]">
                <p className="font-medium text-[var(--text-strong)]">{item.title}</p>
                <p>{item.category} · {formatRelativeTime(item.occursAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
