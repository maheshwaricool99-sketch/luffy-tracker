import type { EngineAuditEvent } from "@/server/engines/engine-types";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function toneFor(result: string) {
  if (result === "success") return "bg-emerald-400";
  if (result === "failed") return "bg-rose-400";
  return "bg-sky-400";
}

export function EngineAuditPreview({ events, emptyLabel }: { events: EngineAuditEvent[]; emptyLabel?: string }) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[13px] text-[#70839B]">
        {emptyLabel ?? "No recent engine activity recorded."}
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {events.map((e) => (
        <li key={e.id} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
          <span className={`mt-1.5 inline-block h-2 w-2 rounded-full ${toneFor(e.result)}`} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-[12px] font-semibold text-[#F3F7FF]">{formatTime(e.createdAt)}</span>
              <span className="text-[12px] text-[#A3B5CB]">{e.action}</span>
            </div>
            <div className="mt-0.5 text-[12px] text-[#70839B]">
              {e.actorEmail ?? "system"}
              {e.reason ? ` · ${e.reason}` : ""}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
