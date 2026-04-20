import { Card } from "@/components/ui/card";
import type { EventAlert } from "@/lib/analysis/types";
import { formatCompactUsd, formatRelativeTime } from "@/lib/analysis/formatters";

type Props = {
  events: EventAlert[];
  entitlement: boolean;
};

function severityClass(severity: EventAlert["severity"]) {
  if (severity === "CRITICAL") return "border-rose-400/40";
  if (severity === "HIGH") return "border-amber-400/40";
  return "border-[var(--line)]";
}

export function EventAlertsCard({ events, entitlement }: Props) {
  return (
    <Card title="Event Alerts" subtitle="Time-sensitive events that can shift setup quality.">
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {events.length === 0 ? <p className="text-sm text-[var(--text-soft)]">No significant events in the last 24h.</p> : null}
        {events.map((event) => (
          <article key={event.id} className={`rounded-lg border-l-4 border border-[var(--line)] p-3 ${severityClass(event.severity)}`}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
              <span>{event.kind.replaceAll("_", " ")}</span>
              <span>{event.occurredAt ? formatRelativeTime(event.occurredAt) : event.scheduledFor ? formatRelativeTime(event.scheduledFor) : "—"}</span>
            </div>
            <p className="text-sm font-medium text-[var(--text-strong)]">{event.title}</p>
            <p className="text-xs text-[var(--text-soft)]">{event.description}</p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)]">{event.source}</span>
              {event.valueUsd ? <span className="text-[var(--text-soft)]">{formatCompactUsd(event.valueUsd)}</span> : null}
            </div>
          </article>
        ))}
      </div>
      {!entitlement ? <p className="mt-3 text-xs text-[var(--text-muted)]">Some high-impact event classes require Premium.</p> : null}
    </Card>
  );
}
