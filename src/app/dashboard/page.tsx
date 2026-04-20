export const dynamic = "force-dynamic";

import { Panel } from "@/components/primitives/Panel";
import { SectionHeader } from "@/components/primitives/SectionHeader";
import { StatusChip } from "@/components/primitives/StatusChip";
import { HealthGrid, MetricGrid, SignalTable } from "@/components/app/terminal-pages";
import { getDashboardSnapshot } from "@/lib/signals/signal-engine";
import { getViewer } from "@/lib/auth";
import { resolveEntitlements } from "@/lib/entitlements";
import { LockedFeature } from "@/components/ui/locked-feature";

export default async function DashboardPage() {
  const viewer = await getViewer();
  const entitlements = resolveEntitlements(viewer);
  const snapshot = await getDashboardSnapshot();
  const providerSummary = snapshot.health.providers.map((provider) => `${provider.market.toUpperCase()} ${provider.status}`).join(" · ");
  const lastScanTime = snapshot.health.scanner.reduce((latest, item) => Math.max(latest, item.lastScanTime || 0), 0);
  const signalCount = snapshot.signals.length;
  const leaders = snapshot.signals.slice(0, 6);
  const laggards = [...snapshot.signals].sort((a, b) => a.confidence - b.confidence).slice(0, 6);

  return (
    <div className="space-y-5">
      <SectionHeader title="Dashboard" subtitle="Institutional market intelligence overview with scanner truth, provider pressure, and signal quality." />
      {!entitlements.isPremium ? <LockedFeature title="Free accounts only receive delayed/limited premium summaries." detail="Upgrade to unlock live signal counts and full premium detail surfaces." /> : null}
      <MetricGrid
        items={[
          { label: "Market Status", value: snapshot.health.degraded ? "Monitored" : "Stable", meta: providerSummary, tone: <StatusChip label={snapshot.health.degraded ? "DEGRADED" : "HEALTHY"} tone={snapshot.health.degraded ? "yellow" : "green"} /> },
          { label: "Scanner Coverage", value: `${Math.round(snapshot.health.scanner.reduce((acc, item) => acc + item.coveragePct, 0) / Math.max(snapshot.health.scanner.length, 1))}%`, meta: "Average market coverage", tone: <StatusChip label="COVERAGE" tone="blue" /> },
          { label: "Signal Health", value: `${snapshot.summary.totalSignals}`, meta: `${snapshot.summary.elite} elite · ${snapshot.summary.strong} strong`, tone: <StatusChip label="LIVE BOOK" tone="green" /> },
          { label: "Active Regime", value: snapshot.signals[0]?.regime.trend ?? "Neutral", meta: "Lead signal regime", tone: <StatusChip label="REGIME" tone="blue" /> },
        ]}
      />
      <Panel title="Scanner State Strip" subtitle="Warm-up phase, snapshot restore, and provider health summary.">
        <div className="flex flex-wrap items-center gap-2">
          {snapshot.health.snapshotRestoreActive ? <StatusChip label="Restored Snapshot Active" tone="blue" /> : null}
          {snapshot.health.scanner.map((item) => <StatusChip key={item.market} label={`${item.market.toUpperCase()} ${item.warmupPhase.replaceAll("_", " ")}`} tone={item.degradedMode ? "yellow" : "green"} />)}
          <span className="ml-auto text-[12px] font-medium text-[#70809A]">
            Last scan: {lastScanTime ? new Date(lastScanTime).toLocaleTimeString() : "Pending"} · Signals: {snapshot.summary.totalSignals}
          </span>
        </div>
      </Panel>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-8">
          <Panel title="Top Signals" subtitle="Highest-confidence active signal set." bodyClassName="p-0">
            {signalCount === 0 ? (
              <div className="px-6 py-10 text-center text-[13px] font-medium text-[#70809A]">
                No high-confidence signals yet.
                <br />
                Scanner is warming up or filtering aggressively.
              </div>
            ) : (
              <SignalTable signals={snapshot.signals} />
            )}
          </Panel>
        </div>
        <div className="col-span-12 space-y-6 pb-20 xl:col-span-4">
          <Panel title="Leaders / Laggards">
            <div className="space-y-4 text-[13px] text-[#A7B4C8]">
              <div>
                <div className="mb-2 text-[12px] font-medium uppercase tracking-[0.08em] text-[#70809A]">Leaders</div>
                <div className="space-y-2">
                  {leaders.length > 0 ? leaders.map((signal) => (
                    <div key={signal.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0F1D31] px-3 py-2">
                      <span>{signal.symbol}</span>
                      <span className="text-[#F3F7FF]">{signal.confidence}</span>
                    </div>
                  )) : <div className="text-[#70809A]">Waiting for ranked leaders.</div>}
                </div>
              </div>
              <div>
                <div className="mb-2 text-[12px] font-medium uppercase tracking-[0.08em] text-[#70809A]">Laggards</div>
                <div className="space-y-2">
                  {laggards.length > 0 ? laggards.map((signal) => (
                    <div key={`${signal.id}-lag`} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0F1D31] px-3 py-2">
                      <span>{signal.symbol}</span>
                      <span className="text-[#F3F7FF]">{signal.confidence}</span>
                    </div>
                  )) : <div className="text-[#70809A]">No laggards yet.</div>}
                </div>
              </div>
            </div>
          </Panel>
          <Panel title="Alert Summary">
            <div className="space-y-3 text-[13px] text-[#A7B4C8]">
              <div>Restored signals: <span className="float-right text-[#F3F7FF]">{snapshot.health.engine.restoredSignals}</span></div>
              <div>Fallback usage: <span className="float-right text-[#F3F7FF]">{Object.keys(snapshot.health.fallbackUsage).length}</span></div>
              <div>Validation issues: <span className="float-right text-[#F3F7FF]">{Object.keys(snapshot.health.validationFailures).length}</span></div>
              <div>Scanner phase: <span className="float-right text-[#F3F7FF]">{snapshot.health.scanner.map((item) => item.warmupPhase.replace("phase_", "P")).join(", ")}</span></div>
            </div>
          </Panel>
          <Panel title="Trust Layer">
            <div className="space-y-3 text-[13px] text-[#A7B4C8]">
              <div>Access tier <span className="float-right text-[#F3F7FF]">{entitlements.plan}</span></div>
              <div>Live signals <span className="float-right text-[#F3F7FF]">{entitlements.canViewLiveSignals ? "ENABLED" : "LOCKED"}</span></div>
              <div>Signal delay <span className="float-right text-[#F3F7FF]">{entitlements.signalDelayMinutes} min</span></div>
            </div>
          </Panel>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-12">
        <Panel title="Performance Snapshot" className="xl:col-span-6">
          <div className="grid grid-cols-2 gap-3 text-[13px] text-[#A7B4C8]">
            <div>Published <span className="float-right text-[#F3F7FF]">{snapshot.summary.totalSignals}</span></div>
            <div>Average confidence <span className="float-right text-[#F3F7FF]">{snapshot.summary.avgConfidence}</span></div>
            <div>Elite <span className="float-right text-[#F3F7FF]">{snapshot.summary.elite}</span></div>
            <div>Watchlist <span className="float-right text-[#F3F7FF]">{snapshot.summary.watchlist}</span></div>
            <div>Last scan <span className="float-right text-[#F3F7FF]">{lastScanTime ? new Date(lastScanTime).toLocaleTimeString() : "--"}</span></div>
            <div>Visible signals <span className="float-right text-[#F3F7FF]">{signalCount}</span></div>
          </div>
        </Panel>
        <Panel title="Breadth / Pulse" className="xl:col-span-6">
          <div className="space-y-3">
            {snapshot.health.scanner.map((market) => (
              <div key={market.market} className="rounded-2xl border border-white/[0.06] bg-[#0F1D31] px-3 py-3 text-[13px] text-[#A7B4C8]">
                <div className="flex items-center justify-between">
                  <span>{market.market.toUpperCase()}</span>
                  <span className="text-[#F3F7FF]">{market.coveragePct}%</span>
                </div>
                <div className="mt-2 text-[12px] text-[#70809A]">Live {market.liveCount} · Cached {market.cachedCount} · Restored {market.restoredCount}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <HealthGrid health={snapshot.health} />
    </div>
  );
}
