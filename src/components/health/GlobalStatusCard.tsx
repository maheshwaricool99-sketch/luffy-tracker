import type { HealthResponse } from "@/lib/health/health-types";
import { HealthStatusPill } from "./HealthStatusPill";
import { HealthTimestamp } from "./HealthTimestamp";

const STATUS_ACCENT: Record<string, string> = {
  operational: "border-l-emerald-500/60 bg-emerald-500/[0.04]",
  degraded: "border-l-amber-500/60 bg-amber-500/[0.04]",
  partial_outage: "border-l-orange-500/60 bg-orange-500/[0.04]",
  down: "border-l-rose-500/60 bg-rose-500/[0.04]",
};

const EXECUTION_LABELS = {
  enabled: "Enabled",
  disabled: "Disabled by Design",
};

const DATA_LABELS = {
  live: "Live",
  snapshot: "Snapshot",
  stale: "Stale",
};

const SIGNALS_LABELS = {
  fresh: "Fresh",
  delayed: "Delayed",
  blocked: "Blocked",
};

export function GlobalStatusCard({
  data,
  bootstrapping = false,
  recovering = false,
}: {
  data: HealthResponse;
  bootstrapping?: boolean;
  recovering?: boolean;
}) {
  const { status, summary, timestamps } = data;
  const accent = STATUS_ACCENT[status] ?? STATUS_ACCENT.degraded;

  return (
    <div className={`overflow-hidden rounded-2xl border border-l-4 border-white/[0.06] bg-[#0B1728] p-5 md:p-6 ${accent}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <HealthStatusPill status={status} size="md" />
            <span className="text-xl font-semibold text-[#F3F7FF] md:text-2xl">{summary.title}</span>
            {bootstrapping && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#5B8CFF]/25 bg-[#5B8CFF]/10 px-2 py-0.5 text-[10px] font-semibold text-[#8DB6FF]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5B8CFF]" />
                Warming up
              </span>
            )}
            {recovering && !bootstrapping && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                Recovering
              </span>
            )}
          </div>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[#A7B4C8]">
            {summary.message}
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <HealthTimestamp ts={timestamps.lastSystemUpdate} label="Updated" className="text-[12px]" />
        </div>
      </div>

      {/* Sub-status strip */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SubStatusPill
          label="Data"
          value={DATA_LABELS[summary.dataState] ?? summary.dataState}
          status={summary.dataState}
        />
        <SubStatusPill
          label="Signals"
          value={SIGNALS_LABELS[summary.signalsState] ?? summary.signalsState}
          status={summary.signalsState}
        />
        <SubStatusPill
          label="Execution"
          value={EXECUTION_LABELS[summary.executionState] ?? summary.executionState}
          status={summary.executionState}
        />
        <SubStatusPill
          label="Coverage"
          value={summary.coverageText || "—"}
          status="neutral"
          noIndicator
        />
      </div>

      {/* Quick timestamps */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-white/[0.04] pt-4">
        <HealthTimestamp ts={timestamps.lastScan} label="Last scan" className="text-[11px]" />
        <HealthTimestamp ts={timestamps.lastSignal} label="Last signal" className="text-[11px]" />
        {timestamps.lastRecoveryAttempt && (
          <HealthTimestamp ts={timestamps.lastRecoveryAttempt} label="Last recovery" className="text-[11px]" />
        )}
      </div>
    </div>
  );
}

function SubStatusPill({
  label,
  value,
  status,
  noIndicator,
}: {
  label: string;
  value: string;
  status: string;
  noIndicator?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <span className="text-[10px] uppercase tracking-[0.1em] text-[#70809A]">{label}</span>
      <div className="flex items-center gap-1.5">
        {!noIndicator && <HealthStatusPill status={status} showDot size="xs" label={value} />}
        {noIndicator && <span className="text-[12px] font-medium text-[#A7B4C8]">{value}</span>}
      </div>
    </div>
  );
}
