import type { SignalDrawerDto } from "@/lib/signals/types/signalDtos";

export function AdminDiagnosticsPanel({ signal }: { signal: SignalDrawerDto | null }) {
  if (!signal?.adminDiagnostics) return null;
  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-[#0B1728] p-4 text-[13px] text-[#A7B4C8]">
      <div>Strategy <span className="float-right text-[#F3F7FF]">{signal.adminDiagnostics.sourceStrategy ?? "--"}</span></div>
      <div>Version <span className="float-right text-[#F3F7FF]">{signal.adminDiagnostics.sourceStrategyVersion ?? "--"}</span></div>
      <div>Override <span className="float-right text-[#F3F7FF]">{signal.adminDiagnostics.adminOverride ? "YES" : "NO"}</span></div>
    </div>
  );
}
