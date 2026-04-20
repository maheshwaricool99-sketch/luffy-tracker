"use client";

import { useState } from "react";
import {
  AdminDrawer,
  AdminHeader,
  AdminKeyValueGrid,
  AdminPage,
  AdminPanel,
  AdminStatCard,
  AdminStatGrid,
  AdminTimeline,
} from "@/components/admin/admin-ui";
import { StatusChip } from "@/components/primitives/StatusChip";
import type { HealthResponse } from "@/lib/health/health-types";

export function AdminIntegrityPageClient({ health }: { health: HealthResponse }) {
  const integrityScore = Math.round(health.reliability.score);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState("Overview");

  return (
    <AdminPage>
      <AdminHeader
        title="Integrity"
        description="Trust, validation, freshness, publishing safety, and data-quality enforcement."
        badges={[
          { label: "Trust Engine", tone: "blue" },
          { label: "Live", tone: "blue" },
          { label: "Critical", tone: "yellow" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <button className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-[#F3F7FF]">Refresh</button>
            <button className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-[#F3F7FF]">Run Integrity Checks</button>
            <button className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-[#F3F7FF]">Revalidate Feeds</button>
            <button className="h-10 rounded-xl bg-[#5B8CFF] px-3.5 text-sm font-semibold text-white">Pause Publishing</button>
          </div>
        }
      />

      <AdminStatGrid className="xl:grid-cols-6">
        <AdminStatCard label="Integrity Score" value={`${integrityScore}/100`} subtext={health.summary.signalsState === "blocked" ? "Publishing restricted due to stale feeds" : "Publishing allowed with restrictions"} chip={<StatusChip label={health.reliability.label.replaceAll("_", " ")} tone={integrityScore >= 85 ? "green" : integrityScore >= 60 ? "yellow" : "red"} />} accent={integrityScore >= 85 ? "green" : integrityScore >= 60 ? "amber" : "red"} />
        <AdminStatCard label="Fresh Signals" value={String(health.markets.crypto.signalStats.valid1h + health.markets.us.signalStats.valid1h + health.markets.india.signalStats.valid1h)} subtext="Published with acceptable freshness" />
        <AdminStatCard label="Blocked Signals" value={String(health.markets.crypto.signalStats.filtered1h + health.markets.us.signalStats.filtered1h + health.markets.india.signalStats.filtered1h)} subtext="Rejected by trust gates" accent="amber" />
        <AdminStatCard label="Stale Feeds" value={String(Object.values(health.markets).filter((m) => m.signalStats.freshnessState === "stale").length)} subtext="Markets failing freshness rules" accent="red" />
        <AdminStatCard label="Price Mismatches" value={String(health.incidents.filter((i) => i.title.toLowerCase().includes("price")).length)} subtext="Divergence incidents currently tracked" />
        <AdminStatCard label="Publishing State" value={health.summary.signalsState.toUpperCase()} subtext="Whether new signals are safe to emit" chip={<StatusChip label={health.summary.signalsState} tone={health.summary.signalsState === "fresh" ? "green" : health.summary.signalsState === "delayed" ? "yellow" : "red"} />} />
      </AdminStatGrid>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr),minmax(360px,0.8fr)]">
        <div className="space-y-5">
          <AdminPanel title="Integrity Overview" subtitle="Current trust posture and top blockers.">
            <div className="grid gap-4 md:grid-cols-[0.9fr,1.1fr]">
              <div className="rounded-[20px] border border-white/10 bg-[#0F1D31] p-5">
                <div className="text-[44px] font-bold tracking-[-0.04em] text-[#F4F8FD]">{integrityScore}</div>
                <div className="mt-1 text-[14px] text-[#9FB1C7]">Publishing {health.summary.signalsState === "blocked" ? "restricted" : "allowed"} right now</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusChip label={`Freshness ${health.reliability.breakdown.freshness}`} tone="blue" />
                  <StatusChip label={`Coverage ${health.reliability.breakdown.coverage}`} tone="blue" />
                  <StatusChip label={`Providers ${health.reliability.breakdown.providerQuality}`} tone="blue" />
                  <StatusChip label={`Trust ${health.trust.posture}`} tone={health.trust.posture === "TRUSTED" ? "green" : health.trust.posture === "CAUTION" ? "yellow" : "red"} />
                </div>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-[#0F1D31] p-5">
                <div className="text-sm font-semibold text-[#F4F8FD]">Top Trust Issues</div>
                <div className="mt-3 space-y-3 text-[13px] text-[#A3B5CB]">
                  {health.trust.issues.map((issue) => (
                    <div key={issue.key} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold text-[#F4F8FD]">{issue.title}</div>
                        <StatusChip label={issue.status} tone={issue.severity === "danger" ? "red" : issue.severity === "warning" ? "yellow" : "blue"} />
                      </div>
                      <div className="mt-2 text-[#A3B5CB]">{issue.summary}</div>
                      <div className="mt-2 space-y-1 text-[12px] text-[#8EA3BC]">
                        {issue.details.map((detail) => (
                          <div key={detail}>- {detail}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel title="Validation Rules" subtitle="Freshness, coverage, structure, and duplicate-prevention checks.">
            <div className="space-y-3 overflow-x-auto">
              {[
                ["Price Freshness", "Realtime price age must remain inside market threshold", health.summary.dataState === "stale" ? "Fail" : "Pass", "2 affected", "Just now"],
                ["Coverage Threshold", "Scanner coverage must remain above publish floor", integrityScore < 60 ? "Warn" : "Pass", "1 affected", "Just now"],
                ["Valid Signal Structure", "Stop and target structure must be complete", "Pass", "0 affected", "Just now"],
                ["Duplicate Prevention", "Existing active signal must not already cover symbol+direction", "Pass", "0 affected", "Just now"],
                ["Price Divergence Limit", "Cross-source mismatch must remain inside tolerance", health.incidents.some((i) => i.title.toLowerCase().includes("price")) ? "Warn" : "Pass", "1 affected", "Just now"],
              ].map(([rule, description, status, count, checked]) => (
                <button key={rule} onClick={() => setDrawerOpen(true)} className="grid min-w-[760px] w-full grid-cols-[1.1fr,1.5fr,0.7fr,0.7fr,0.8fr,0.6fr] gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-4 text-left text-[13px] text-[#DCE7F4]">
                  <div className="font-semibold">{rule}</div>
                  <div className="text-[#93A7BD]">{description}</div>
                  <div>{status}</div>
                  <div>{count}</div>
                  <div>{checked}</div>
                  <div className="text-[#8DB6FF]">Inspect</div>
                </button>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel title="Signal Quality Monitor" subtitle="Candidates, blocked signals, and publish eligibility.">
            <AdminKeyValueGrid items={[
              { label: "Candidates", value: String(health.markets.crypto.signalStats.generated1h + health.markets.us.signalStats.generated1h + health.markets.india.signalStats.generated1h) },
              { label: "Passed", value: String(health.markets.crypto.signalStats.valid1h + health.markets.us.signalStats.valid1h + health.markets.india.signalStats.valid1h) },
              { label: "Blocked", value: String(health.trust.blockedSignals.filter((signal) => signal.active).length) },
              { label: "Delayed", value: health.summary.signalsState },
              { label: "Expired", value: "Unavailable" },
            ]} />
            <div className="mt-4 space-y-3">
              {health.trust.blockedSignals.slice(0, 5).map((signal) => (
                <button key={signal.signalId} onClick={() => setDrawerOpen(true)} className="grid w-full gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-4 text-left text-[13px] text-[#DCE7F4] md:grid-cols-[0.9fr,0.7fr,1.1fr,0.8fr,0.8fr]">
                  <div className="font-semibold">{signal.symbol}</div>
                  <div>{signal.market.toUpperCase()}</div>
                  <div className="text-[#93A7BD]">{signal.reasonText}</div>
                  <div>{signal.canAutoRecover ? "Auto-retry active" : "Manual follow-up"}</div>
                  <div>{signal.scope}</div>
                </button>
              ))}
            </div>
          </AdminPanel>
        </div>

        <div className="space-y-5">
          <AdminPanel title="Price Integrity" subtitle="Source health summary, divergence, and trust state.">
            <AdminTimeline items={health.trust.fallbackMarkets.map((market) => ({
              id: market.market,
              title: `${market.market.toUpperCase()} · ${market.livePriceCoveragePct}% live coverage`,
              subtitle: market.fallbackUsagePct > 0 ? `Fallback exposure ${market.fallbackUsagePct}% across ${market.affectedSymbols} symbols.` : "Primary source healthy within trust thresholds.",
              meta: `${market.status} · providers ${market.affectedProviders.join(", ") || "primary-only"}`,
              tone: market.fallbackUsagePct > 0 ? "yellow" : "green",
            }))} />
          </AdminPanel>

          <AdminPanel title="Publishing Controls" subtitle="Current policy and thresholds.">
            <AdminKeyValueGrid items={[
              { label: "Publishing State", value: health.summary.signalsState },
              { label: "Strict Mode", value: "Enabled" },
              { label: "Min Integrity Score", value: "70" },
              { label: "Freshness Threshold", value: "Market dependent" },
              { label: "Coverage Threshold", value: "50%" },
              { label: "Price Mismatch Limit", value: "Internal tolerance" },
            ]} />
          </AdminPanel>

          <AdminPanel title="Blocker Reasons" subtitle="Grouped causes for blocked or delayed output.">
            <AdminTimeline items={health.trust.issues.map((issue) => ({
              id: issue.key,
              title: issue.title,
              subtitle: issue.summary,
              meta: issue.details.join(" · "),
              tone: issue.severity === "danger" ? "red" : issue.severity === "warning" ? "yellow" : "blue",
            }))} />
          </AdminPanel>
        </div>
      </div>

      <AdminDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Signal Integrity Detail"
        subtitle="Validation, price sources, and publish state."
        status={<StatusChip label="Restricted" tone="yellow" />}
        tabs={["Overview", "Validation", "Price Sources", "Activity", "Audit"]}
        activeTab={tab}
        onTabChange={setTab}
      >
        {tab === "Overview" ? <AdminKeyValueGrid items={[
          { label: "Trust Posture", value: health.trust.posture },
          { label: "Publish Status", value: health.summary.signalsState },
          { label: "Fallback Markets", value: String(health.trust.fallbackMarkets.filter((market) => market.fallbackUsagePct > 0).length) },
          { label: "Blocked Signals", value: String(health.trust.blockedSignals.filter((signal) => signal.active).length) },
          { label: "Active Major Incidents", value: String(health.trust.incidentSummary.activeMajor) },
          { label: "Impact", value: health.trust.incidentSummary.impact },
        ]} /> : null}
        {tab === "Validation" ? <AdminTimeline items={[
          { id: "freshness", title: "Price freshness", subtitle: "PASS", tone: "green" },
          { id: "coverage", title: "Coverage threshold", subtitle: integrityScore < 60 ? "FAIL" : "PASS", tone: integrityScore < 60 ? "red" : "green" },
          { id: "div", title: "Price divergence", subtitle: "WARN", tone: "yellow" },
        ]} /> : null}
        {tab === "Price Sources" ? <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-[#06111F] p-4 text-xs text-[#C7D5E5]">{JSON.stringify({ markets: health.markets, fallback: health.trust.fallbackMarkets }, null, 2)}</pre> : null}
        {tab === "Activity" ? <AdminTimeline items={health.incidents.slice(0, 5).map((incident) => ({ id: incident.id, title: incident.title, subtitle: incident.summary, meta: incident.status, tone: incident.severity === "critical" ? "red" : "yellow" }))} /> : null}
        {tab === "Audit" ? <AdminTimeline items={[{ id: "audit", title: "Audit logging enabled", subtitle: "Integrity rule and publishing changes are logged.", tone: "blue" }]} /> : null}
      </AdminDrawer>
    </AdminPage>
  );
}
