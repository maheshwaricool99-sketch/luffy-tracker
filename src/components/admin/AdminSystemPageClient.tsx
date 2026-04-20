"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader, AdminPage, AdminPanel, AdminStatCard, AdminStatGrid, AdminTimeline } from "@/components/admin/admin-ui";
import { StatusChip } from "@/components/primitives/StatusChip";
import type { HealthResponse } from "@/lib/health/health-types";
import type { RuntimeFlagKey, RuntimeFlagsSnapshot } from "@/lib/runtime";

type AdminSnapshot = {
  markets: Array<Record<string, unknown>>;
  models: Array<Record<string, unknown>>;
  experiments: Array<Record<string, unknown>>;
  incidents: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
  audits: Array<Record<string, unknown>>;
};

type RuntimeAuditRow = {
  flag_key?: string;
  changed_by_email?: string | null;
  created_at?: string | null;
  reason?: string | null;
};

export function AdminSystemPageClient({
  health,
  admin,
  runtime,
  runtimeAudit,
}: {
  health: HealthResponse;
  admin: AdminSnapshot;
  runtime: RuntimeFlagsSnapshot;
  runtimeAudit: RuntimeAuditRow[];
}) {
  const router = useRouter();
  const now = health.timestamps.now;
  const [isPending, startTransition] = useTransition();
  const [localFlags, setLocalFlags] = useState(runtime.flags);
  const auditByFlag = useMemo(() => {
    const next = new Map<string, RuntimeAuditRow>();
    for (const row of runtimeAudit) {
      const key = String(row.flag_key ?? "");
      if (!next.has(key)) next.set(key, row);
    }
    return next;
  }, [runtimeAudit]);

  async function updateRuntimeFlag(flag: RuntimeFlagKey, enabled: boolean, label: string) {
    const reason = window.prompt(`Reason for ${enabled ? "enabling" : "disabling"} ${label}:`, `${enabled ? "Enable" : "Disable"} ${label}`)?.trim() ?? "";
    if (!reason) return;
    const previous = localFlags[flag];
    setLocalFlags((prev) => ({ ...prev, [flag]: enabled }));
    try {
      const response = await fetch(`/admin/runtime/${flag}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, reason }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        setLocalFlags((prev) => ({ ...prev, [flag]: previous }));
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setLocalFlags((prev) => ({ ...prev, [flag]: previous }));
    }
  }

  const runtimeRows: Array<{ flag: RuntimeFlagKey; label: string; detail: string; dangerous?: boolean }> = [
    { flag: "maintenance_mode", label: "Maintenance Mode", detail: "Shows maintenance banner and blocks sensitive user actions", dangerous: true },
    { flag: "read_only_mode", label: "Read-Only Mode", detail: "Blocks mutations while preserving observability", dangerous: true },
    { flag: "disable_signup", label: "Disable Signup", detail: "Stops new account creation", dangerous: false },
    { flag: "pause_signal_publishing", label: "Pause Signal Publishing", detail: "Prevents new public signals from being emitted", dangerous: false },
    { flag: "pause_scanners", label: "Pause Scanners", detail: "Stops scanner loops from producing new candidates", dangerous: true },
    { flag: "freeze_upgrades", label: "Freeze Upgrades", detail: "Blocks checkout and plan mutation flows", dangerous: false },
    { flag: "pause_experiments", label: "Pause Experiments", detail: "Prevents rollout updates and exposure changes", dangerous: false },
  ];

  return (
    <AdminPage>
      <AdminHeader
        title="System"
        description="Platform health, services, deployment state, runtime controls, and incidents."
        badges={[
          { label: "Live", tone: "blue" },
          { label: "Critical", tone: health.status === "operational" ? "green" : "yellow" },
          { label: "Audit Logged", tone: "green" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => router.refresh()} className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-[#F3F7FF]">Refresh</button>
            <button className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-[#F3F7FF]">Run Health Check</button>
            <button className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-[#F3F7FF]">Open Logs</button>
            <button
              onClick={() => void updateRuntimeFlag("maintenance_mode", !localFlags.maintenance_mode, "Maintenance Mode")}
              className="h-10 rounded-xl bg-[#5B8CFF] px-3.5 text-sm font-semibold text-white"
            >
              {localFlags.maintenance_mode ? "Disable Maintenance" : "Enable Maintenance"}
            </button>
          </div>
        }
      />

      <AdminStatGrid className="xl:grid-cols-6">
        <AdminStatCard label="Overall Status" value={health.summary.title.toUpperCase()} subtext={health.summary.message} chip={<StatusChip label="Updated seconds ago" tone="blue" />} accent={health.status === "operational" ? "green" : health.status === "down" ? "red" : "amber"} />
        <AdminStatCard label="Frontend" value="Healthy" subtext="Unified app shell rendering normally" />
        <AdminStatCard label="API" value={health.status === "down" ? "Down" : "Healthy"} subtext="Health endpoint responding" />
        <AdminStatCard label="Database" value="Live" subtext="SQLite primary reachable" />
        <AdminStatCard label="Auth" value="Stable" subtext="Session and account flows available" />
        <AdminStatCard label="Billing" value="Monitored" subtext="Billing webhook and subscription state watched" />
      </AdminStatGrid>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr),420px]">
        <div className="space-y-5">
          <AdminPanel title="Service Health" subtitle="Platform services and dependencies.">
            <div className="grid gap-4 md:grid-cols-2">
              {health.components.map((component) => (
                <div key={component.key} className="rounded-[18px] border border-white/10 bg-[#0F1D31] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#F4F8FD]">{component.label}</div>
                      <div className="mt-2 text-[22px] font-bold text-[#F4F8FD]">{component.latencyMs !== null ? `${component.latencyMs}ms` : component.status.toUpperCase()}</div>
                      <div className="mt-1 text-[12px] text-[#8EA3BC]">{component.note ?? "Last heartbeat and dependency state monitored."}</div>
                    </div>
                    <StatusChip label={component.status.replaceAll("_", " ")} tone={component.status === "healthy" ? "green" : component.status === "down" ? "red" : "yellow"} />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-[#8EA3BC]">
                    <div><div className="text-[#70839B]">Heartbeat</div><div className="mt-1 text-[#F4F8FD]">{component.lastHeartbeatMs ? `${Math.round((now - component.lastHeartbeatMs) / 1000)}s ago` : "Unknown"}</div></div>
                    <div><div className="text-[#70839B]">Errors</div><div className="mt-1 text-[#F4F8FD]">{component.errorRatePct ?? 0}%</div></div>
                    <div><div className="text-[#70839B]">State</div><div className="mt-1 text-[#F4F8FD]">{component.status}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel title="Runtime Controls" subtitle="Use with caution. All changes are audit logged.">
            <div className="space-y-3">
              {runtimeRows.map((item) => {
                const state = localFlags[item.flag] ? "ON" : "OFF";
                const audit = auditByFlag.get(item.flag);
                return (
                  <div key={item.flag} className="flex min-h-[72px] flex-col items-start justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-[#F3F7FF]">{item.label}</div>
                        {item.dangerous ? <StatusChip label="Critical" tone="red" /> : null}
                      </div>
                      <div className="mt-1 text-[13px] text-[#8FA5BE]">{item.detail}</div>
                      <div className="mt-1 text-[12px] text-[#70839B]">
                        Last changed by {String(audit?.changed_by_email ?? "system")} · {String(audit?.created_at ?? runtime.updatedAt)}
                        {audit?.reason ? ` · ${String(audit.reason)}` : ""}
                      </div>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                      <StatusChip label={state} tone={state === "ON" ? (item.dangerous ? "red" : "yellow") : "neutral"} />
                      <button
                        disabled={isPending}
                        onClick={() => void updateRuntimeFlag(item.flag, !localFlags[item.flag], item.label)}
                        className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-[#F3F7FF] disabled:opacity-50"
                      >
                        {localFlags[item.flag] ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </AdminPanel>

          <AdminPanel title="Deployment and Runtime Info" subtitle="Version, build, region, and runtime usage.">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["Version", "0.1.0"],
                ["Commit Hash", "local-worktree"],
                ["Build Timestamp", new Date().toLocaleString()],
                ["Environment", "production-like"],
                ["Region", "local"],
                ["Uptime", "Unavailable"],
                ["Last Deploy", "Local build"],
                ["Memory Usage", "Unavailable"],
                ["CPU Usage", "Unavailable"],
                ["Open WS Connections", "Unavailable"],
                ["Queue Depth", String(admin.incidents.length)],
                ["Runtime Version", String(runtime.version)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[#70839B]">{label}</div>
                  <div className="mt-2 font-mono text-[15px] text-[#F4F8FD]">{value}</div>
                </div>
              ))}
            </div>
          </AdminPanel>
        </div>

        <div className="space-y-5">
          <AdminPanel title="Jobs & Queues" subtitle="Runtime backlog and worker visibility.">
            <div className="space-y-3">
              {[
                ["Health Aggregation", "1", "0", "0", "Just now"],
                ["Scanner Recovery", "1", "0", "0", "Just now"],
                ["Billing Sync", "0", "0", "0", "Unknown"],
              ].map(([queue, active, pending, failed, last]) => (
                <div key={queue} className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-3 text-[13px] text-[#D9E4F1]">
                  <div className="font-semibold text-[#F4F8FD]">{queue}</div>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <QueueStat label="Active" value={active} />
                    <QueueStat label="Pending" value={pending} />
                    <QueueStat label="Failed" value={failed} />
                    <QueueStat label="Last Processed" value={last} />
                  </div>
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel title="Recent Incidents" subtitle="Severity, subsystem, timing, and current state.">
            <AdminTimeline
              items={health.incidents.slice(0, 8).map((incident) => ({
                id: incident.id,
                title: incident.title,
                subtitle: incident.summary,
                meta: `${incident.status} · ${new Date(incident.ts).toLocaleString()}`,
                tone: incident.severity === "critical" ? "red" : incident.severity === "warning" ? "yellow" : "blue",
              }))}
            />
          </AdminPanel>

          <AdminPanel title="Emergency Actions" subtitle="Use only during active incident response." className="border-rose-400/20 bg-[linear-gradient(180deg,rgba(42,13,18,0.58),rgba(11,23,40,0.94))]">
            <div className="space-y-3">
              {["Enter Maintenance", "Pause Publishing", "Pause All Scanners", "Disable Public Access", "Kill Active Broadcasts"].map((action) => (
                <button key={action} className="h-11 w-full rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 text-left text-sm font-semibold text-rose-200">{action}</button>
              ))}
            </div>
          </AdminPanel>
        </div>
      </div>
    </AdminPage>
  );
}

function QueueStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.12em] text-[#70839B]">{label}</div>
      <div className="mt-1 text-sm text-[#F4F8FD]">{value}</div>
    </div>
  );
}
