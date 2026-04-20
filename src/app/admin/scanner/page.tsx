export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { listAdminSnapshot } from "@/lib/admin";
import { Panel } from "@/components/primitives/Panel";
import { SectionHeader } from "@/components/primitives/SectionHeader";

export default async function AdminScannerPage() {
  const viewer = await getViewer();
  if (!viewer || !["ADMIN", "SUPERADMIN"].includes(viewer.role)) redirect("/dashboard");
  const admin = listAdminSnapshot();

  return (
    <div className="space-y-5">
      <SectionHeader title="Admin Scanner" subtitle="Real market controls: enable/disable, publish freeze, stale thresholds, and warm-up behavior." />
      <div className="grid gap-4 xl:grid-cols-3">
        {admin.markets.map((market: Record<string, unknown>) => (
          <Panel key={String(market.market)} title={String(market.market).toUpperCase()}>
            <div className="space-y-2 text-[13px] text-[#A7B4C8]">
              <div>Enabled <span className="float-right text-[#F3F7FF]">{Number(market.enabled) ? "YES" : "NO"}</span></div>
              <div>Publish Freeze <span className="float-right text-[#F3F7FF]">{Number(market.publish_freeze) ? "ON" : "OFF"}</span></div>
              <div>Stale Threshold <span className="float-right text-[#F3F7FF]">{String(market.stale_threshold_ms)}ms</span></div>
              <div>Warm-Up <span className="float-right text-[#F3F7FF]">{String(market.warmup_behavior)}</span></div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
