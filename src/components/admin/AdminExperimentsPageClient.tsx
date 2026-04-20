"use client";

import { useState } from "react";
import { AdminDrawer, AdminHeader, AdminKeyValueGrid, AdminPage, AdminPanel, AdminStatCard, AdminStatGrid, AdminTimeline } from "@/components/admin/admin-ui";
import { StatusChip } from "@/components/primitives/StatusChip";

type Flag = Record<string, unknown>;

export function AdminExperimentsPageClient({ experiments }: { experiments: Flag[] }) {
  const [tab, setTab] = useState("Active");
  const [selected, setSelected] = useState<Flag | null>(experiments[0] ?? null);
  const [drawerTab, setDrawerTab] = useState("Overview");

  const active = experiments.filter((flag) => Number(flag.enabled) === 1);
  const drafts = experiments.filter((flag) => Number(flag.enabled) === 0);

  return (
    <AdminPage>
      <AdminHeader
        title="Experiments"
        description="Feature flags, controlled rollouts, ranking tests, and safe experiment management."
        badges={[
          { label: "Admin Only", tone: "yellow" },
          { label: "Controlled", tone: "blue" },
          { label: "Audit Logged", tone: "green" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <button className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-[#F3F7FF]">Refresh</button>
            <button className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-[#F3F7FF]">Export Results</button>
            <button className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-[#F3F7FF]">Kill All Active</button>
            <button className="h-10 rounded-xl bg-[#5B8CFF] px-3.5 text-sm font-semibold text-white">Create Experiment</button>
          </div>
        }
      />

      <AdminStatGrid>
        <AdminStatCard label="Active" value={String(active.length)} subtext="Running controlled rollouts" chip={<StatusChip label="Running" tone="green" />} accent="green" />
        <AdminStatCard label="Drafts" value={String(drafts.length)} subtext="Not yet exposed" />
        <AdminStatCard label="Completed" value="0" subtext="No archived results in this store" />
        <AdminStatCard label="Killed" value="0" subtext="No terminated experiments in this store" />
        <AdminStatCard label="Flags Enabled" value={String(active.length)} subtext="Feature flags currently on" />
        <AdminStatCard label="Users Impacted" value="Internal" subtext="Audience state is stored as scope strings" />
      </AdminStatGrid>

      <div className="flex flex-wrap gap-2">
        {["Active", "Drafts", "Completed", "Feature Flags", "Rollout History"].map((name) => (
          <button key={name} onClick={() => setTab(name)} className={`h-11 rounded-xl border px-4 text-sm font-semibold ${tab === name ? "border-[#5B8CFF]/35 bg-[#5B8CFF]/12 text-[#F3F7FF]" : "border-white/10 bg-white/[0.03] text-[#9FB1C7]"}`}>{name}</button>
        ))}
      </div>

      {tab !== "Feature Flags" && tab !== "Rollout History" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {(tab === "Active" ? active : tab === "Drafts" ? drafts : []).map((flag) => (
            <button key={String(flag.key)} onClick={() => { setSelected(flag); setDrawerTab("Overview"); }} className="min-h-[240px] rounded-[20px] border border-white/10 bg-[#0B1728] p-[18px] text-left hover:bg-[#0F1D31]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-[#F4F8FD]">{String(flag.key)}</div>
                  <div className="mt-1 text-[13px] text-[#8EA3BC]">{String(flag.audience ?? "all")} · last updated {String(flag.updated_at ?? "")}</div>
                </div>
                <StatusChip label={Number(flag.enabled) ? "Running" : "Draft"} tone={Number(flag.enabled) ? "green" : "neutral"} />
              </div>
              <div className="mt-4 line-clamp-2 text-[14px] leading-6 text-[#A6B8CD]">{String(flag.description ?? "No description")}</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  ["Rollout %", "Internal"],
                  ["Users Affected", "Scoped"],
                  ["Success Metric Delta", "Unavailable"],
                  ["Error Delta", "Unavailable"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-[#70839B]">{label}</div>
                    <div className="mt-2 text-[18px] font-bold text-[#F4F8FD]">{value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusChip label={String(flag.audience ?? "all")} tone="blue" />
                <StatusChip label={Number(flag.enabled) ? "10% rollout" : "draft"} tone="neutral" />
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {tab === "Feature Flags" ? (
        <AdminPanel title="Feature Flags" subtitle="Current values, scope, environment, and operator history.">
          <div className="space-y-3 overflow-x-auto">
            {experiments.map((flag) => (
              <button key={String(flag.key)} onClick={() => { setSelected(flag); setDrawerTab("Overview"); }} className="grid min-w-[920px] w-full grid-cols-[1.1fr,1.6fr,0.8fr,0.8fr,0.8fr,1fr,1fr,0.8fr] gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-4 text-left text-[13px] text-[#DCE7F4]">
                <div className="font-semibold">{String(flag.key)}</div>
                <div className="text-[#93A7BD]">{String(flag.description ?? "")}</div>
                <div>{Number(flag.enabled) ? "Enabled" : "Disabled"}</div>
                <div>{String(flag.audience ?? "all")}</div>
                <div>Prod</div>
                <div>{String(flag.updated_by ?? "system")}</div>
                <div>{String(flag.updated_at ?? "")}</div>
                <div className="text-[#8DB6FF]">Inspect</div>
              </button>
            ))}
          </div>
        </AdminPanel>
      ) : null}

      {tab === "Rollout History" ? (
        <AdminPanel title="Rollout History" subtitle="Recent feature and rollout changes.">
          <AdminTimeline items={experiments.slice(0, 8).map((flag, index) => ({
            id: `${String(flag.key)}-${index}`,
            title: `Flag ${String(flag.key)} ${Number(flag.enabled) ? "enabled" : "updated"}`,
            subtitle: `Scope ${String(flag.audience ?? "all")} · result persisted`,
            meta: String(flag.updated_at ?? ""),
            tone: Number(flag.enabled) ? "green" : "blue",
          }))} />
        </AdminPanel>
      ) : null}

      <AdminDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? String(selected.key) : "Experiment Detail"}
        subtitle={selected ? String(selected.description ?? "") : undefined}
        status={selected ? <StatusChip label={Number(selected.enabled) ? "Running" : "Draft"} tone={Number(selected.enabled) ? "green" : "neutral"} /> : undefined}
        tabs={["Overview", "Variants", "Scope", "Results", "Guardrails", "Audit"]}
        activeTab={drawerTab}
        onTabChange={setDrawerTab}
      >
        {selected ? (
          <div className="space-y-4">
            {drawerTab === "Overview" ? (
              <AdminPanel title="Overview" subtitle="Experiment identity, status, hypothesis, and owner.">
                <AdminKeyValueGrid items={[
                  { label: "Name", value: String(selected.key) },
                  { label: "Type", value: "Feature Flag" },
                  { label: "Owner", value: String(selected.updated_by ?? "system") },
                  { label: "Status", value: Number(selected.enabled) ? "Running" : "Draft" },
                  { label: "Audience", value: String(selected.audience ?? "all") },
                  { label: "Hypothesis", value: String(selected.description ?? "No hypothesis recorded") },
                ]} />
              </AdminPanel>
            ) : null}
            {drawerTab === "Variants" ? (
              <AdminPanel title="Variants" subtitle="Control and variant state.">
                <div className="grid gap-3 md:grid-cols-2">
                  {["Control", "Variant A"].map((variant) => (
                    <div key={variant} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                      <div className="text-sm font-semibold text-[#F4F8FD]">{variant}</div>
                      <div className="mt-2 text-[13px] text-[#8EA3BC]">Weight, assignment count, and KPI delta are not persisted yet.</div>
                    </div>
                  ))}
                </div>
              </AdminPanel>
            ) : null}
            {drawerTab === "Scope" ? (
              <AdminPanel title="Scope" subtitle="Audience and rollout guardrails.">
                <AdminKeyValueGrid items={[
                  { label: "Target Audience", value: String(selected.audience ?? "all") },
                  { label: "Roles Included", value: "Admin-configured audience" },
                  { label: "Market Included", value: "All" },
                  { label: "Rollout %", value: Number(selected.enabled) ? "Internal rollout" : "Draft only" },
                  { label: "Region Restrictions", value: "Unavailable" },
                  { label: "Internal Only", value: "Yes" },
                ]} />
              </AdminPanel>
            ) : null}
            {drawerTab === "Results" ? (
              <AdminPanel title="Results" subtitle="Outcome metrics and guardrail deltas.">
                <AdminKeyValueGrid items={[
                  { label: "Users Exposed", value: "Unavailable" },
                  { label: "Conversion Uplift", value: "Unavailable" },
                  { label: "Error Change", value: "Unavailable" },
                  { label: "Latency Delta", value: "Unavailable" },
                  { label: "Integrity Delta", value: "Unavailable" },
                  { label: "Summary", value: Number(selected.enabled) ? "Running and collecting results" : "No exposure yet" },
                ]} />
              </AdminPanel>
            ) : null}
            {drawerTab === "Guardrails" ? (
              <AdminPanel title="Guardrails" subtitle="Kill switch, rollout thresholds, and rollback controls.">
                <AdminKeyValueGrid items={[
                  { label: "Kill Switch Enabled", value: "Yes" },
                  { label: "Max Rollout", value: "Internal only" },
                  { label: "Auto Rollback", value: "Not configured" },
                  { label: "Latency Threshold", value: "Unavailable" },
                  { label: "Error Threshold", value: "Unavailable" },
                  { label: "Trust Degradation Threshold", value: "Unavailable" },
                ]} />
              </AdminPanel>
            ) : null}
            {drawerTab === "Audit" ? (
              <AdminPanel title="Audit" subtitle="Experiment changes are auditable.">
                <AdminKeyValueGrid items={[
                  { label: "Changed By", value: String(selected.updated_by ?? "system") },
                  { label: "Changed At", value: String(selected.updated_at ?? "Unknown") },
                  { label: "Current Value", value: Number(selected.enabled) ? "Enabled" : "Disabled" },
                  { label: "Scope", value: String(selected.audience ?? "all") },
                ]} />
              </AdminPanel>
            ) : null}
          </div>
        ) : null}
      </AdminDrawer>
    </AdminPage>
  );
}
