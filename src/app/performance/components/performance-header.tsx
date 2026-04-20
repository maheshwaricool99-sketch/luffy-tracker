import type { PerformanceApiResponse } from "@/lib/performance/types";
import { formatDuration, formatTimestamp } from "../lib/formatters";

export function PerformanceHeader({ data }: { data: PerformanceApiResponse }) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(12,25,39,0.98),rgba(5,11,21,0.94))] p-6 shadow-[0_26px_90px_rgba(2,8,20,0.45)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.08),transparent_30%)]" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7DD3FC]">Performance Overview</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#F5FAFF] md:text-[2.6rem]">
            Real closed-trade performance across all markets and strategies.
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#9CB0C7]">
            Only finalized outcomes are included. Open positions stay out of headline analytics, losses remain visible, and source freshness is disclosed clearly.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <HeaderBadge label="Verified Data" value={data.meta.statusLabel} />
          <HeaderBadge label="Data State" value={data.meta.dataState} />
          <HeaderBadge
            label="Last Updated"
            value={data.meta.lastUpdated === null ? "No data yet" : formatTimestamp(data.meta.lastUpdated)}
            detail={
              data.meta.lastUpdated === null
                ? "Waiting for first finalized outcome"
                : data.meta.delayedByMs
                  ? `${formatDuration(data.meta.delayedByMs)} behind`
                  : "Fresh sync"
            }
          />
        </div>
      </div>
    </section>
  );
}

function HeaderBadge({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[#6F879D]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#F3F7FF]">{value}</div>
      {detail ? <div className="mt-1 text-[12px] text-[#91A4BB]">{detail}</div> : null}
    </div>
  );
}
