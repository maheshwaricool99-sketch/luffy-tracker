import type { ReactNode } from "react";
import Link from "next/link";
import { DiagnosticTable } from "@/components/health/DiagnosticTable";
import { ScannerCoverageCard } from "@/components/health/ScannerCoverageCard";
import { FreshnessBadge } from "@/components/health/FreshnessBadge";
import { DataTable } from "@/components/primitives/DataTable";
import { DensePanel } from "@/components/primitives/DensePanel";
import { Panel } from "@/components/primitives/Panel";
import { SignalClassChip } from "@/components/primitives/SignalClassChip";
import { StatusChip } from "@/components/primitives/StatusChip";
import { StatCard } from "@/components/primitives/StatCard";
import type { HealthSnapshot, PublishedSignal } from "@/lib/signals/signal-types";

function directionTone(direction: "long" | "short") {
  return direction === "long" ? "green" : "red";
}

function qualityTone(quality: string) {
  if (quality === "healthy") return "green";
  if (quality === "stale") return "yellow";
  return "red";
}

export function SignalTable({ signals, selectedId }: { signals: PublishedSignal[]; selectedId?: string }) {
  return (
    <DataTable
      rows={signals}
      rowKey={(row) => row.id}
      selectedKey={selectedId}
      emptyMessage="No signal candidates met the current integrity threshold."
      tableMinWidth="980px"
      cardRender={(row) => (
        <Link
          href={`/signals/${row.id}`}
          className="block rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[#F3F7FF]">{row.symbol}</div>
              <div className="mt-1 text-[12px] text-[#70809A]">{row.market.toUpperCase()} · {row.class}</div>
            </div>
            <StatusChip label={row.direction.toUpperCase()} tone={directionTone(row.direction)} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-[12px] text-[#A7B4C8]">
            <Metric label="Confidence" value={String(row.confidence)} />
            <Metric label="Freshness" value={<FreshnessBadge state={row.sourceMeta.dataState} />} />
            <Metric label="Entry" value={row.entry.toFixed(3)} />
            <Metric label="Stop" value={row.stopLoss.toFixed(3)} />
            <Metric label="Target" value={row.takeProfit.toFixed(3)} />
            <Metric label="Expected R" value={row.expectedR.toFixed(2)} />
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[#70809A]">
            <span>{row.lifecycleState}</span>
            <span>{new Date(row.timestamp).toLocaleTimeString()}</span>
          </div>
        </Link>
      )}
      columns={[
        { key: "symbol", label: "Symbol", width: "110px", render: (row) => <Link href={`/signals/${row.id}`} className="font-semibold text-[#F3F7FF] hover:text-white">{row.symbol}</Link> },
        { key: "market", label: "Market", width: "72px", render: (row) => row.market.toUpperCase() },
        { key: "direction", label: "Direction", width: "72px", render: (row) => <StatusChip label={row.direction.toUpperCase()} tone={directionTone(row.direction)} /> },
        { key: "class", label: "Class", width: "90px", render: (row) => <SignalClassChip signalClass={row.class} /> },
        { key: "confidence", label: "Confidence", width: "96px", align: "right", render: (row) => `${row.confidence}` },
        { key: "entry", label: "Entry", width: "96px", align: "right", render: (row) => row.entry.toFixed(3) },
        { key: "stop", label: "Stop", width: "96px", align: "right", render: (row) => row.stopLoss.toFixed(3) },
        { key: "target", label: "Target", width: "96px", align: "right", render: (row) => row.takeProfit.toFixed(3) },
        { key: "r", label: "R", width: "64px", align: "right", render: (row) => row.expectedR.toFixed(2) },
        { key: "freshness", label: "Freshness", width: "108px", render: (row) => <FreshnessBadge state={row.sourceMeta.dataState} /> },
        { key: "time", label: "Time", width: "110px", render: (row) => new Date(row.timestamp).toLocaleTimeString() },
      ]}
    />
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-[#0F1D31] px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.1em] text-[#70809A]">{label}</div>
      <div className="mt-1 text-[13px] font-medium text-[#F3F7FF]">{value}</div>
    </div>
  );
}

export function MetricGrid({ items }: { items: Array<{ label: string; value: string; meta?: string; tone?: ReactNode }> }) {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {items.map((item) => (
        <StatCard key={item.label} label={item.label} value={item.value} meta={item.meta} tone={item.tone} />
      ))}
    </div>
  );
}

export function HealthGrid({ health }: { health: HealthSnapshot }) {
  const diagnostics = health.scanner.flatMap((market) =>
    Object.entries(market.skipReasons).map(([reason, count]) => ({
      id: `${market.market}-${reason}`,
      market: market.market,
      reason,
      count,
    })),
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard label="WebSocket Status" value={health.engine.inFlight ? "Live Run" : health.snapshotRestoreActive ? "Restored" : "Idle"} meta="Engine runtime state" tone={<StatusChip label={health.engine.status.toUpperCase()} tone={health.engine.status === "ready" ? "green" : health.engine.status === "restored" ? "blue" : "yellow"} />} />
        <StatCard label="Scanner Status" value={health.degraded ? "Degraded" : "Stable"} meta={health.degradedReasons.join(", ") || "No active integrity exceptions"} tone={<StatusChip label={health.degraded ? "MONITORED" : "HEALTHY"} tone={health.degraded ? "yellow" : "green"} />} />
        <StatCard label="Freshness" value={`${health.sourceHealth.filter((item) => item.dataState === "live").length}/${health.sourceHealth.length}`} meta="Markets with live coverage" tone={<StatusChip label="FRESHNESS" tone="blue" />} />
        <StatCard label="Degraded Mode" value={health.snapshotRestoreActive ? "Restored" : health.degraded ? "Active" : "Inactive"} meta={`Restored signals ${health.engine.restoredSignals}`} tone={<StatusChip label={health.snapshotRestoreActive ? "SNAPSHOT" : health.degraded ? "WATCH" : "CLEAR"} tone={health.snapshotRestoreActive ? "blue" : health.degraded ? "yellow" : "green"} />} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {health.scanner.map((item) => (
          <ScannerCoverageCard key={item.market} scanner={item} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr,1fr]">
        <Panel title="Feed Health Table" subtitle="Provider availability, warm-up phase, and freshness per market.">
          <div className="space-y-3">
            {health.sourceHealth.map((item) => (
              <DensePanel key={item.market} className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[14px] font-semibold text-[#F3F7FF]">{item.market.toUpperCase()}</div>
                  <div className="mt-1 text-[12px] text-[#70809A]">{item.primarySource} · coverage {item.coveragePct}% · {item.warmupPhase.replaceAll("_", " ")}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <FreshnessBadge state={item.dataState} />
                  <StatusChip label={item.providerStatus.toUpperCase()} tone={item.providerStatus === "healthy" ? "green" : item.providerStatus === "backoff" ? "yellow" : "red"} />
                </div>
              </DensePanel>
            ))}
          </div>
        </Panel>
        <Panel title="Integrity Incidents" subtitle="Aggregate validation and skip diagnostics.">
          <DiagnosticTable rows={diagnostics} />
        </Panel>
      </div>
    </div>
  );
}

export function SignalDetailCard({ signal }: { signal: PublishedSignal }) {
  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <Panel title={`${signal.symbol} ${signal.direction.toUpperCase()}`} subtitle={`${signal.market.toUpperCase()} · ${signal.lifecycleState}`} className="xl:col-span-8" bodyClassName="grid h-[420px] grid-cols-1 gap-4 p-4 lg:grid-cols-[1.5fr,1fr]">
        <DensePanel className="space-y-3">
          <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#70809A]">Chart Context</div>
          <div className="flex h-[320px] items-center justify-center rounded-2xl border border-white/[0.06] bg-[#0F1D31] text-[13px] text-[#70809A]">
            Structure, regime, and timing context for {signal.symbol}
          </div>
        </DensePanel>
        <div className="space-y-4">
          <DensePanel>
            <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#70809A]">Trade Levels</div>
            <div className="mt-3 space-y-2 text-[13px] text-[#A7B4C8]">
              <div>Entry <span className="float-right text-[#F3F7FF]">{signal.entry.toFixed(3)}</span></div>
              <div>Stop <span className="float-right text-[#F3F7FF]">{signal.stopLoss.toFixed(3)}</span></div>
              <div>Target <span className="float-right text-[#F3F7FF]">{signal.takeProfit.toFixed(3)}</span></div>
              <div>Expected R <span className="float-right text-[#F3F7FF]">{signal.expectedR.toFixed(2)}</span></div>
            </div>
          </DensePanel>
          <DensePanel>
            <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#70809A]">Regime</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusChip label={signal.regime.trend} tone={signal.regime.trend === "bullish" ? "green" : signal.regime.trend === "bearish" ? "red" : "blue"} />
              <StatusChip label={signal.regime.volatility} tone="yellow" />
              <StatusChip label={signal.regime.liquidity} tone={signal.regime.liquidity === "healthy" ? "green" : "yellow"} />
            </div>
          </DensePanel>
          <DensePanel>
            <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#70809A]">Source Freshness</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <FreshnessBadge state={signal.sourceMeta.dataState} />
              <StatusChip label={signal.dataQuality} tone={qualityTone(signal.dataQuality)} />
            </div>
          </DensePanel>
        </div>
      </Panel>
      <Panel title="Breakdown" subtitle="Rationale, invalidation, and contributors." className="xl:col-span-4" bodyClassName="space-y-4 p-4">
        <DensePanel>
          <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#70809A]">Rationale</div>
          <ul className="mt-3 space-y-2 text-[13px] leading-[18px] text-[#A7B4C8]">
            {signal.rationale.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </DensePanel>
        <DensePanel>
          <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#70809A]">Invalidation</div>
          <ul className="mt-3 space-y-2 text-[13px] leading-[18px] text-[#A7B4C8]">
            {signal.invalidatesOn.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </DensePanel>
      </Panel>
    </div>
  );
}
