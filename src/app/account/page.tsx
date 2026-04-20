export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { resolveEntitlements } from "@/lib/entitlements";
import { Panel } from "@/components/primitives/Panel";
import { SectionHeader } from "@/components/primitives/SectionHeader";

export default async function AccountPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/account");
  const entitlements = resolveEntitlements(viewer);

  return (
    <div className="space-y-5">
      <SectionHeader title="Account" subtitle="One shared account surface for members, premium users, and admins inside the same app shell." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Profile">
          <div className="space-y-3 text-[13px] text-[#A7B4C8]">
            <div>Username <span className="float-right text-[#F3F7FF]">{viewer.username ?? "--"}</span></div>
            <div>Email <span className="float-right text-[#F3F7FF]">{viewer.email}</span></div>
            <div>Role <span className="float-right text-[#F3F7FF]">{viewer.role}</span></div>
            <div>Account <span className="float-right text-[#F3F7FF]">{viewer.accountStatus}</span></div>
            <div>Verified <span className="float-right text-[#F3F7FF]">{viewer.emailVerified ? "VERIFIED" : "UNVERIFIED"}</span></div>
            <div>Last Login <span className="float-right text-[#F3F7FF]">{viewer.lastLoginAt ? new Date(viewer.lastLoginAt).toLocaleString() : "--"}</span></div>
          </div>
        </Panel>
        <Panel title="Plan">
          <div className="space-y-3 text-[13px] text-[#A7B4C8]">
            <div>Plan <span className="float-right text-[#F3F7FF]">{entitlements.plan}</span></div>
            <div>Status <span className="float-right text-[#F3F7FF]">{viewer.subscription?.status ?? "NONE"}</span></div>
            <div>Current Period End <span className="float-right text-[#F3F7FF]">{viewer.subscription?.currentPeriodEnd ? new Date(viewer.subscription.currentPeriodEnd).toLocaleString() : "--"}</span></div>
            {!entitlements.isPremium ? <a href="/pricing" className="inline-flex rounded-xl border border-[#5B8CFF]/35 bg-[#5B8CFF]/12 px-4 py-2 text-sm font-semibold text-[#F3F7FF]">Upgrade</a> : null}
            {entitlements.isAdmin ? <a href="/admin/members" className="inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-[#F3F7FF]">Open Member Management</a> : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}
