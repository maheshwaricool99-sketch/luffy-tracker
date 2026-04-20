export const dynamic = "force-dynamic";

import { getViewer } from "@/lib/auth";
import { getUserAlerts } from "@/lib/user-product";
import { resolveEntitlements } from "@/lib/entitlements";
import { LockedFeature } from "@/components/ui/locked-feature";
import { DataTable } from "@/components/primitives/DataTable";
import { Panel } from "@/components/primitives/Panel";
import { SectionHeader } from "@/components/primitives/SectionHeader";

export default async function AlertsPage() {
  const viewer = await getViewer();
  const alerts = viewer ? getUserAlerts(viewer) : [];
  const entitlements = resolveEntitlements(viewer);

  return (
    <div className="space-y-5">
      <SectionHeader title="Alerts" subtitle="User-owned alert definitions with plan-aware delivery behavior." />
      {!entitlements.canUseRealtimeAlerts ? <LockedFeature title="Free accounts receive delayed digest behavior." detail="Premium enables realtime in-app and email delivery." /> : null}
      <Panel title="Alert Feed" className="min-h-[420px] lg:h-[640px]" bodyClassName="p-0">
        <DataTable
          rows={alerts}
          rowKey={(row) => row.id}
          emptyMessage="No saved alerts."
          scrollMode="panel"
          tableMinWidth="720px"
          cardRender={(row) => (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[#F3F7FF]">{row.symbol ?? "All symbols"}</div>
                  <div className="mt-1 text-[12px] text-[#70809A]">{row.type}</div>
                </div>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${row.enabled ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/[0.04] text-[#A7B4C8]"}`}>
                  {row.enabled ? "Enabled" : "Paused"}
                </span>
              </div>
              <div className="mt-3 rounded-xl border border-white/[0.05] bg-[#0F1D31] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.1em] text-[#70809A]">Config</div>
                <div className="mt-1 break-words text-[12px] leading-5 text-[#A7B4C8]">{JSON.stringify(row.config)}</div>
              </div>
              <div className="mt-3 text-[11px] text-[#70809A]">Updated {new Date(row.updatedAt).toLocaleString()}</div>
            </div>
          )}
          columns={[
            { key: "symbol", label: "Symbol", render: (row) => <span className="text-[#F3F7FF]">{row.symbol ?? "ALL"}</span> },
            { key: "type", label: "Type", render: (row) => row.type },
            { key: "enabled", label: "Enabled", render: (row) => row.enabled ? "YES" : "NO" },
            { key: "config", label: "Config", render: (row) => JSON.stringify(row.config) },
            { key: "updated", label: "Updated", render: (row) => new Date(row.updatedAt).toLocaleString() },
          ]}
        />
      </Panel>
    </div>
  );
}
