import { Card } from "@/components/ui/card";
import type { DataFreshness } from "@/lib/analysis/types";

type Props = { freshness: DataFreshness };

function tone(status: "LIVE" | "DELAYED" | "STALE") {
  if (status === "LIVE") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (status === "DELAYED") return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  return "border-rose-400/30 bg-rose-400/10 text-rose-200";
}

export function FreshnessBar({ freshness }: Props) {
  return (
    <Card title="Feed Freshness" subtitle="Data recency by source feed.">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {Object.entries(freshness).map(([key, value]) => (
          <div key={key} className={`rounded-lg border px-3 py-2 ${tone(value.status)}`}>
            <p className="text-xs uppercase tracking-wide">{key}</p>
            <p className="text-sm font-semibold">{value.status}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
