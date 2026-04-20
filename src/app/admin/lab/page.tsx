export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { Panel } from "@/components/primitives/Panel";
import { SectionHeader } from "@/components/primitives/SectionHeader";

export default async function AdminLabPage() {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "SUPERADMIN") redirect("/dashboard");

  return (
    <div className="space-y-5">
      <SectionHeader title="Admin Lab" subtitle="Superadmin-only sandbox. Never exposed to customer roles." />
      <Panel title="Sandbox">
        <div className="text-[13px] text-[#A7B4C8]">Internal-only experimentation surface. Route is server-gated to superadmins.</div>
      </Panel>
    </div>
  );
}
