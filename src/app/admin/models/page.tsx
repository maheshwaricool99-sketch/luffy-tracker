export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { listAdminSnapshot } from "@/lib/admin";
import { Panel } from "@/components/primitives/Panel";
import { SectionHeader } from "@/components/primitives/SectionHeader";

export default async function AdminModelsPage() {
  const viewer = await getViewer();
  if (!viewer || !["ADMIN", "SUPERADMIN"].includes(viewer.role)) redirect("/dashboard");
  const admin = listAdminSnapshot();

  return (
    <div className="space-y-5">
      <SectionHeader title="Admin Models" subtitle="Enable/disable model families and adjust thresholds with persisted state." />
      <div className="grid gap-4 xl:grid-cols-3">
        {admin.models.map((model: Record<string, unknown>) => (
          <Panel key={String(model.model)} title={String(model.model)}>
            <div className="space-y-2 text-[13px] text-[#A7B4C8]">
              <div>Enabled <span className="float-right text-[#F3F7FF]">{Number(model.enabled) ? "YES" : "NO"}</span></div>
              <div>Threshold <span className="float-right text-[#F3F7FF]">{String(model.threshold)}</span></div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
