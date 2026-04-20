"use client";

import type { EngineAuditEvent, ExecutionEngineStatus } from "@/server/engines/engine-types";
import { EngineStatusBadge } from "./EngineStatusBadge";
import { EngineMetricRow, type EngineMetric } from "./EngineMetricRow";
import { EngineReasonBlock } from "./EngineReasonBlock";
import { EngineAuditPreview } from "./EngineAuditPreview";
import { EngineActionBar, type EngineAction } from "./EngineActionBar";

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function yesNo(v: boolean) {
  return v ? "Yes" : "No";
}

export function ExecutionEngineCard({
  status,
  audit,
  onAction,
  pendingAction,
}: {
  status: ExecutionEngineStatus;
  audit: EngineAuditEvent[];
  onAction: (action: "restart" | "reload_config" | "set_mode", payload?: { mode?: string }) => void;
  pendingAction: string | null;
}) {
  const tone = status.status === "error" ? "error" : status.status === "inactive_by_design" ? "info" : "neutral";

  const metrics: EngineMetric[] = [
    { label: "Mode", value: status.mode.replace(/_/g, " ") },
    { label: "Execution Enabled", value: yesNo(status.executionEnabled) },
    { label: "Paper Trading", value: yesNo(status.paperTradingEnabled) },
    { label: "Broker Connectivity", value: status.brokerConnectivityRequired ? "Required" : "Not required" },
    { label: "Last Heartbeat", value: status.lastHeartbeatAt ? fmtTime(status.lastHeartbeatAt) : "N/A", hint: status.lastHeartbeatAt ? undefined : "No runtime heartbeat is expected in current mode" },
    { label: "Last Config Change", value: fmtTime(status.lastConfigChangeAt), hint: status.lastConfigChangedBy ? `By ${status.lastConfigChangedBy}` : undefined },
    { label: "Last Restart", value: fmtTime(status.lastRestartAt) },
  ];

  const actions: EngineAction[] = [
    { key: "reload_config", label: "Reload Execution Config", onClick: () => onAction("reload_config"), pending: pendingAction === "reload_config" },
    { key: "restart", label: "Restart Execution Service", danger: true, onClick: () => onAction("restart"), pending: pendingAction === "restart", disabled: status.status === "restarting" },
  ];

  if (status.availableActions.includes("set_mode")) {
    actions.push({
      key: "set_mode_test",
      label: "Enable Internal Test Mode",
      danger: true,
      onClick: () => onAction("set_mode", { mode: "internal_test_only" }),
      pending: pendingAction === "set_mode",
      disabled: status.mode === "internal_test_only",
    });
    actions.push({
      key: "set_mode_disable",
      label: "Disable Execution",
      onClick: () => onAction("set_mode", { mode: "disabled_by_admin" }),
      disabled: status.mode === "disabled_by_admin",
    });
    actions.push({
      key: "set_mode_signal",
      label: "Revert to Signal Only",
      onClick: () => onAction("set_mode", { mode: "signal_only" }),
      disabled: status.mode === "signal_only",
    });
  }

  return (
    <section className="overflow-hidden rounded-[22px] border border-white/10 bg-[#0B1728]">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-[18px] font-semibold text-[#F5FAFF]">Trading Execution</h2>
            <EngineStatusBadge status={status.status} />
          </div>
          <p className="mt-1 text-[13px] text-[#9FB1C7]">Order routing and broker execution layer</p>
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
