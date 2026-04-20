import type { Incident } from "@/lib/health/health-types";
import { HealthTimestamp } from "./HealthTimestamp";

const SEVERITY_DOT: Record<string, string> = {
  info: "bg-blue-400",
  warning: "bg-amber-400",
  critical: "bg-rose-400 animate-pulse",
};

const STATUS_LABEL: Record<string, { text: string; class: string }> = {
  active: { text: "Active", class: "text-rose-400" },
  monitoring: { text: "Monitoring", class: "text-amber-400" },
  resolved: { text: "Resolved", class: "text-emerald-400" },
};

export function IncidentTimeline({ incidents }: { incidents: Incident[] }) {
  const activeCount = incidents.filter((i) => i.status === "active").length;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0B1728] p-5 md:p-6">
      <div className="mb-4">
        <h2 className="text-[16px] font-semibold text-[#F3F7FF]">Incident Log</h2>
        <p className="mt-0.5 text-[12px] text-[#70809A]">
          {activeCount > 0
            ? `${activeCount} active incident${activeCount !== 1 ? "s" : ""}`
            : "No active incidents"}
          {" · "}system detects and adapts automatically
        </p>
      </div>

      {incidents.length === 0 ? (
        <div className="py-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
            <span className="text-emerald-400">✓</span>
          </div>
          <p className="text-[13px] text-[#A7B4C8]">No incidents recorded this session</p>
          <p className="mt-1 text-[12px] text-[#70809A]">All systems operating within normal parameters</p>
        </div>
      ) : (
        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute left-[5px] top-2 bottom-2 w-px bg-white/[0.06]" />
          {incidents.map((incident) => (
            <IncidentRow key={incident.id} incident={incident} />
          ))}
        </div>
      )}
    </div>
  );
}

function IncidentRow({ incident }: { incident: Incident }) {
  const dot = SEVERITY_DOT[incident.severity] ?? "bg-slate-400";
  const statusInfo = STATUS_LABEL[incident.status] ?? STATUS_LABEL.monitoring;

  return (
    <div className="flex gap-4 pb-4 last:pb-0">
      {/* Dot */}
      <div className="relative mt-1.5 flex-shrink-0">
        <span className={`block h-2.5 w-2.5 rounded-full ${dot}`} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-[13px] font-medium text-[#F3F7FF]">{incident.title}</p>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-medium ${statusInfo.class}`}>{statusInfo.text}</span>
            <HealthTimestamp ts={incident.ts} className="text-[11px]" />
          </div>
        </div>
        <p className="mt-0.5 text-[12px] text-[#A7B4C8]">{incident.summary}</p>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
          {incident.cause && (
            <IncidentFacet label="Why" value={incident.cause} tone="neutral" />
          )}
          {incident.userImpact && (
            <IncidentFacet label="Impact" value={incident.userImpact} tone="warn" />
          )}
          {incident.mitigation && (
            <IncidentFacet label="Mitigation" value={incident.mitigation} tone="ok" />
          )}
        </div>
      </div>
    </div>
  );
}

function IncidentFacet({ label, value, tone }: { label: string; value: string; tone: "neutral" | "warn" | "ok" }) {
  const toneClass =
    tone === "warn" ? "text-amber-300/90" :
    tone === "ok" ? "text-emerald-300/90" :
    "text-[#A7B4C8]";
  return (
    <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-2 py-1.5">
      <p className="text-[9px] uppercase tracking-[0.1em] text-[#70809A]">{label}</p>
      <p className={`mt-0.5 text-[11px] leading-snug ${toneClass}`}>{value}</p>
    </div>
  );
}
