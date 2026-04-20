export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { listAdminSnapshot } from "@/lib/admin";
import { Panel } from "@/components/primitives/Panel";
import { SectionHeader } from "@/components/primitives/SectionHeader";

export default async function AdminReplayPage() {
  const viewer = await getViewer();
  if (!viewer || !["ADMIN", "SUPERADMIN"].includes(viewer.role)) redirect("/dashboard");
  const admin = listAdminSnapshot();

  return (
    <div className="space-y-5">
      <SectionHeader title="Admin Replay" subtitle="Read-only persisted action timeline for operational review." />
      <Panel title="Action Log">
        <div className="space-y-3 text-[13px] text-[#A7B4C8]">
          {admin.actions.map((action: Record<string, unknown>) => (
            <div key={String(action.id)} className="rounded-xl border border-white/[0.06] bg-[#0F1D31] px-3 py-3">
              <div className="font-semibold text-[#F3F7FF]">{String(action.action)}</div>
              <div className="mt-1">{String(action.target ?? "")}</div>
              <div className="mt-2 text-[12px] text-[#70809A]">{String(action.created_at)}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
