import type { SignalDrawerDto } from "@/lib/signals/types/signalDtos";

export function AdminAuditTimeline({ signal }: { signal: SignalDrawerDto | null }) {
  if (!signal?.adminDiagnostics) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0B1728] p-4 text-[13px] text-[#A7B4C8]">
      Diagnostics and admin history are available through the moderation APIs and event log.
    </div>
  );
}
