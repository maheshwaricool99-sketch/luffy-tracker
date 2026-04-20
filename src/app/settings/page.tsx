export const dynamic = "force-dynamic";

import { getViewer } from "@/lib/auth";
import { getUserSettings } from "@/lib/user-product";
import { resolveEntitlements } from "@/lib/entitlements";
import { Panel } from "@/components/primitives/Panel";
import { SectionHeader } from "@/components/primitives/SectionHeader";

export default async function SettingsPage() {
  const viewer = await getViewer();
  const settings = viewer ? getUserSettings(viewer) : { profile: {}, notifications: {} };
  const entitlements = resolveEntitlements(viewer);

  return (
    <div className="space-y-5">
      <SectionHeader title="Settings" subtitle="Profile, account state, plan, and notification preferences stored per user." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Account">
          <div className="space-y-3 text-[13px] text-[#A7B4C8]">
            <div>Email <span className="float-right text-[#F3F7FF]">{viewer?.email ?? "--"}</span></div>
            <div>Role <span className="float-right text-[#F3F7FF]">{viewer?.role ?? "GUEST"}</span></div>
            <div>Plan <span className="float-right text-[#F3F7FF]">{entitlements.plan}</span></div>
            <div>Verified <span className="float-right text-[#F3F7FF]">{viewer?.emailVerified ? "YES" : "NO"}</span></div>
          </div>
        </Panel>
        <Panel title="Notifications">
          <div className="space-y-3 text-[13px] text-[#A7B4C8]">
            {Object.entries(settings.notifications).map(([key, value]) => (
              <div key={key}>{key} <span className="float-right text-[#F3F7FF]">{String(value)}</span></div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
