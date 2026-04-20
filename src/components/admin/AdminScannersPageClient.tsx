"use client";

import { useMemo, useState } from "react";
import {
  AdminDrawer,
  AdminHeader,
  AdminKeyValueGrid,
  AdminPage,
  AdminPanel,
  AdminSearch,
  AdminSelect,
  AdminStatCard,
  AdminStatGrid,
  AdminTimeline,
  AdminToolbar,
} from "@/components/admin/admin-ui";
import { StatusChip } from "@/components/primitives/StatusChip";
import type { HealthResponse } from "@/lib/health/health-types";

export function AdminScannersPageClient({ health }: { health: HealthResponse & { platform?: Record<string, unknown> } }) {
  const [marketFilter, setMarketFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<HealthResponse["markets"]["crypto"] | HealthResponse["markets"]["us"] | HealthResponse["markets"]["india"] | null>(null);
  const [tab, setTab] = useState("Overview");
  const now = health.timestamps.now;

  const scanners = useMemo(() => Object.values(health.markets), [health.markets]).filter((card) => {
    if (marketFilter !== "all" && card.key !== marketFilter) return false;
    if (statusFilter !== "all" && card.status !== statusFilter) return false;
    return true;
  });

  return (
    <AdminPage>
      <AdminHeader
        title="Scanners"
        description="Live scanner health, coverage, freshness, provider state, and recovery controls."
        badges={[
          { label: "Live", tone: "blue" },
          { label: "Ops", tone: "neutral" },
          { label: "Trust Critical", tone: "yellow" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <button className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-[#F3F7FF]">Refresh</button>
            <button className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-[#F3F7FF]">Run Health Checks</button>
            <button className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-[#F3F7FF]">Restart Stale</button>
            <button className="h-10 rounded-xl bg-[#5B8CFF] px-3.5 text-sm font-semibold text-white">Pause All</button>
          </div>
        }
      />

      <AdminStatGrid>
        <AdminStatCard label="Total Scanners" value={String(scanners.length)} subtext="One per market group" />
        <AdminStatCard label="Healthy" value={String(scanners.filter((s) => s.status === "live").length)} subtext="Operational without restrictions" chip={<StatusChip label="Live" tone="green" />} accent="green" />
        <AdminStatCard label="Degraded" value={String(scanners.filter((s) => s.status === "degraded").length)} subtext="Coverage or freshness reduced" chip={<StatusChip label="Watch" tone="yellow" />} accent="amber" />
        <AdminStatCard label="Paused" value="0" subtext="No scanner manually paused" />
        <AdminStatCard label="Stale" value={String(scanners.filter((s) => s.signalStats.freshnessState === "stale").length)} subtext="Needs recovery attention" chip={<StatusChip label="Recovering" tone="red" />} accent="red" />
        <AdminStatCard label="Avg Coverage" value={`${Math.round(scanners.reduce((sum, s) => sum + s.metrics.coverage, 0) / Math.max(1, scanners.length))}%`} subtext="Across current market scanners" />
      </AdminStatGrid>

      <AdminToolbar
        left={
          <>
            <AdminSearch placeholder="Search scanner or provider" disabled />
            <AdminSelect value={marketFilter} onChange={(e) => setMarketFilter(e.target.value)}>
              <option value="all">All Markets</option>
              <option value="crypto">Crypto</option>
              <option value="us">US</option>
              <option value="india">India</option>
            </AdminSelect>
            <AdminSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="live">Live</option>
              <option value="degraded">Degraded</option>
              <option value="snapshot">Snapshot</option>
              <option value="blocked">Blocked</option>
            </AdminSelect>
          </>
        }
        right={
          <>
            <AdminSelect defaultValue="cards">
              <option value="cards">Cards</option>
              <option value="table">Table</option>
            </AdminSelect>
            <AdminSelect defaultValue="30s">
              <option value="30s">30s refresh</option>
              <option value="60s">60s refresh</option>
            </AdminSelect>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {scanners.map((card) => (
          <button key={card.key} onClick={() => setSelected(card)} className="rounded-[20px] border border-white/10 bg-[#0B1728] p-[18px] text-left hover:bg-[#0F1D31]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-[#F4F8FD]">{card.label}</div>
                <div className="mt-1 text-[13px] text-[#8EA3BC]">Last scan {card.timestamps.lastSuccessfulScan ? new Date(card.timestamps.lastSuccessfulScan).toLocaleString() : "never"} · Freshness {card.signalStats.freshnessState}</div>
              </div>
              <StatusChip label={card.status.toUpperCase()} tone={card.status === "live" ? "green" : card.status === "blocked" ? "red" : "yellow"} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              {[
                ["Coverage %", `${card.metrics.coverage}%`],
                ["Symbols Scanned", String(card.scanner.scanned)],
                ["Symbols Skipped", String(card.scanner.skipped)],
                ["Signals Created", String(card.signalStats.generated1h)],
                ["Cycle Duration", card.scanner.lastCycleDurationMs ? `${(card.scanner.lastCycleDurationMs / 1000).toFixed(1)}s` : "—"],
                ["Provider Count", String(card.providers.length)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[#70839B]">{label}</div>
                  <div className="mt-2 text-[20px] font-bold text-[#F4F8FD]">{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {card.providers.map((provider) => (
                <StatusChip key={provider.name} label={`${provider.name} ${provider.status}`} tone={provider.status === "healthy" ? "green" : provider.status === "fallback" ? "yellow" : "neutral"} />
              ))}
            </div>
            <div className="mt-4 min-h-16 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-3 text-[13px] text-[#E6D1A2]">
              {card.status === "snapshot"
                ? "Snapshot mode active because primary live feed missed heartbeat."
                : card.status === "degraded"
                  ? "Coverage reduced below ideal threshold due to provider backoff or delayed feed."
                  : "Live provider healthy — scanner coverage and freshness within acceptable range."}
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-[#F3F7FF]">View Details</button>
              <button className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-[#F3F7FF]">Force Refresh</button>
            </div>
          </button>
        ))}
      </div>

      <AdminPanel title="Recent Events" subtitle="Scanner and provider recovery events.">
        <AdminTimeline
          items={health.incidents.slice(0, 8).map((incident) => ({
            id: incident.id,
            title: incident.title,
            subtitle: incident.summary,
            meta: incident.impact,
            tone: incident.severity === "critical" ? "red" : incident.severity === "warning" ? "yellow" : "blue",
          }))}
        />
      </AdminPanel>

      <AdminDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.label ?? "Scanner Detail"}
        subtitle={selected ? `${selected.metrics.dataSource} · ${selected.whatItMeans}` : undefined}
        status={selected ? <StatusChip label={selected.status.toUpperCase()} tone={selected.status === "live" ? "green" : selected.status === "blocked" ? "red" : "yellow"} /> : undefined}
        tabs={["Overview", "Providers", "Signals", "Events", "Raw State", "Audit"]}
        activeTab={tab}
        onTabChange={setTab}
        footer={selected ? <div className="flex flex-wrap justify-end gap-2"><button className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-[#F3F7FF]">Reset Backoff</button><button className="h-10 rounded-xl bg-[#5B8CFF] px-3.5 text-sm font-semibold text-white">Rebuild Snapshot</button></div> : null}
      >
        {selected ? (
          <>
            {tab === "Overview" ? (
              <div className="space-y-4">
                <AdminPanel title="Operational Status" subtitle="Current runtime state and heartbeat.">
                  <AdminKeyValueGrid items={[
                    { label: "Scanner Name", value: selected.label },
                    { label: "Current Mode", value: selected.scanner.mode },
                    { label: "Last Success", value: selected.timestamps.lastSuccessfulScan ? new Date(selected.timestamps.lastSuccessfulScan).toLocaleString() : "Never" },
                    { label: "Last Failure", value: selected.snapshot.reason ?? "None recorded" },
                    { label: "Heartbeat Age", value: selected.timestamps.lastUpdated ? `${Math.round((now - selected.timestamps.lastUpdated) / 1000)}s` : "Unknown" },
                    { label: "Publish Eligible", value: selected.status === "blocked" ? "No" : "Yes" },
                  ]} />
                </AdminPanel>
                <AdminPanel title="Coverage" subtitle="Coverage, thresholds, and publish readiness.">
                  <AdminKeyValueGrid items={[
                    { label: "Target Universe", value: String(selected.metrics.totalPairs) },
                    { label: "Scanned", value: String(selected.scanner.scanned) },
                    { label: "Skipped", value: String(selected.scanner.skipped) },
                    { label: "Coverage %", value: `${selected.scanner.completionPct}%` },
                    { label: "Minimum Safe Threshold", value: "50%" },
                    { label: "Publish Eligible", value: selected.status === "blocked" ? "Blocked" : "Allowed with checks" },
                  ]} />
                </AdminPanel>
              </div>
            ) : null}
            {tab === "Providers" ? (
              <div className="space-y-4">
                {selected.providers.map((provider) => (
                  <AdminPanel key={provider.name} title={provider.name} subtitle="Provider status, latency, and backoff detail.">
                    <AdminKeyValueGrid items={[
                      { label: "Status", value: provider.status },
                      { label: "Latency", value: provider.latencyMs !== null ? `${provider.latencyMs}ms` : "Unknown" },
                      { label: "Failure Streak", value: provider.note ?? "Unavailable" },
                      { label: "Last Success", value: provider.lastSuccessMs ? new Date(provider.lastSuccessMs).toLocaleString() : "Never" },
                      { label: "Fallback Enabled", value: provider.status === "fallback" ? "Yes" : "No" },
                      { label: "Action", value: "Reset Backoff / Inspect Response" },
                    ]} />
                  </AdminPanel>
                ))}
              </div>
            ) : null}
            {tab === "Signals" ? (
              <AdminKeyValueGrid items={[
                { label: "Candidates Created", value: String(selected.signalStats.generated1h) },
                { label: "Published", value: String(selected.signalStats.valid1h) },
                { label: "Blocked", value: String(selected.signalStats.filtered1h) },
                { label: "Delayed", value: selected.signalStats.freshnessState },
              ]} columns={2} />
            ) : null}
            {tab === "Events" ? <AdminTimeline items={health.incidents.slice(0, 6).map((incident) => ({ id: incident.id, title: incident.title, subtitle: incident.summary, meta: incident.status, tone: incident.severity === "critical" ? "red" : "yellow" }))} /> : null}
            {tab === "Raw State" ? <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-[#06111F] p-4 text-xs text-[#C7D5E5]">{JSON.stringify(selected, null, 2)}</pre> : null}
            {tab === "Audit" ? <AdminTimeline items={[{ id: selected.key, title: "Audit logging enabled", subtitle: "Provider backoff resets and scanner state changes are logged.", tone: "blue" }]} /> : null}
          </>
        ) : null}
      </AdminDrawer>
    </AdminPage>
  );
}
