"use client";

import type { EngineAuditEvent, PriceEngineStatus } from "@/server/engines/engine-types";
import { EngineStatusBadge } from "./EngineStatusBadge";
import { EngineMetricRow, type EngineMetric } from "./EngineMetricRow";
import { EngineReasonBlock } from "./EngineReasonBlock";
import { EngineAuditPreview } from "./EngineAuditPreview";
import { EngineActionBar, type EngineAction } from "./EngineActionBar";

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function fmtAgo(sec: number | null) {
  if (sec === null) return "—";
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

export function PriceEngineCard({
  status,
  audit,
  onAction,
  pendingAction,
}: {
  status: PriceEngineStatus;
  audit: EngineAuditEvent[];
  onAction: (action: "restart" | "reconnect" | "reload_providers" | "flush_cache") => void;
  pendingAction: string | null;
}) {
  const tone = status.status === "down" ? "error" : status.status === "degraded" ? "warn" : status.status === "restarting" ? "info" : "neutral";

  const metrics: EngineMetric[] = [
    { label: "Markets Live", value: `${status.marketsLive} / ${status.marketsTotal}` },
    { label: "Last Heartbeat", value: fmtAgo(status.heartbeatAgoSec) },
    { label: "Last Healthy At", value: fmtTime(status.lastHealthyAt) },
    { label: "Error Rate", value: `${status.errorRatePct}%` },
    { label: "Provider Mode", value: status.providerMode.toUpperCase() },
    { label: "Open Connections", value: String(status.openConnections) },
    { label: "Stale Symbols", value: String(status.staleSymbols) },
    { label: "Last Restart", value: fmtTime(status.lastRestartAt), hint: status.lastRestartBy ? `By ${status.lastRestartBy}` : undefined },
  ];

  const actions: EngineAction[] = [
    {
      key: "restart",
      label: "Restart Price Engine",
      danger: true,
      onClick: () => onAction("restart"),
      pending: pendingAction === "restart",
      disabled: status.status === "restarting",
    },
    { key: "reconnect", label: "Reconnect Providers", onClick: () => onAction("reconnect"), pending: pendingAction === "reconnect" },
    { key: "reload", label: "Reload Providers", onClick: () => onAction("reload_providers"), pending: pendingAction === "reload_providers" },
    { key: "flush", label: "Flush Stale Cache", danger: true, onClick: () => onAction("flush_cache"), pending: pendingAction === "flush_cache" },
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-white/10 bg-[#0B1728]">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-[18px] font-semibold text-[#F5FAFF]">Price Engine</h2>
            <EngineStatusBadge status={status.status} />
          </div>
          <p className="mt-1 text-[13px] text-[#9FB1C7]">
            Market data infrastructure for signal generation and live pricing
          </p>
        </div>
      </header>

      <div className="space-y-5 p-5">
        <EngineMetricRow metrics={metrics} />

        <EngineReasonBlock
          reasonCode={status.reasonCode}
          reason={status.reason}
          impact={status.impact}
          tone={tone}
        />

        <div>
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#70839B]">Actions</div>
          <EngineActionBar actions={actions} />
        </div>

        <div>
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#70839B]">Recent Activity</div>
          <EngineAuditPreview events={audit} />
        </div>
      </div>
    </section>
  );
}
