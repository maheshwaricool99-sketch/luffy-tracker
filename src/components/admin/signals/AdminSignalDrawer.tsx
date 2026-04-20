import type { SignalDrawerDto } from "@/lib/signals/types/signalDtos";
import { AdminModerationPanel } from "./AdminModerationPanel";
import { AdminDiagnosticsPanel } from "./AdminDiagnosticsPanel";
import { AdminAuditTimeline } from "./AdminAuditTimeline";

export function AdminSignalDrawer({ signal }: { signal: SignalDrawerDto | null }) {
  return (
    <div className="space-y-4">
      <AdminModerationPanel signal={signal} />
      <AdminDiagnosticsPanel signal={signal} />
      <AdminAuditTimeline signal={signal} />
    </div>
  );
}
