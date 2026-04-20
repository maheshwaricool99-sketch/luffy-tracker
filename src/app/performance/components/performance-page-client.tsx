"use client";

import { useSearchParams } from "next/navigation";
import type { PerformanceApiResponse, PerformanceRole } from "@/lib/performance/types";
import { usePerformancePolling } from "../hooks/usePerformancePolling";
import { AdminDebugPanel } from "./admin-debug-panel";
import { BreakdownSection } from "./breakdown-section";
import { EquityChart } from "./equity-chart";
import { ExplainBlock } from "./explain-block";
import { MetricGrid } from "./metric-grid";
import { PerformanceHeader } from "./performance-header";
import { TradesFilters } from "./trades-filters";
import { TradesTable } from "./trades-table";

export function PerformancePageClient({
  role,
  initialData,
}: {
  role: PerformanceRole;
  initialData: PerformanceApiResponse;
}) {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const { data, isError, refetch } = usePerformancePolling(role, queryString, initialData);
  const payload = data ?? initialData;

  if (isError && !payload) {
    return (
      <section className="rounded-[28px] border border-rose-400/20 bg-rose-400/10 p-6">
        <h1 className="text-xl font-semibold text-[#FCE7F3]">Unable to load performance data</h1>
        <p className="mt-2 text-sm text-[#FBCFE8]">Please retry in a moment.</p>
        <button onClick={() => void refetch()} className="mt-4 rounded-xl border border-white/10 bg-white/[0.08] px-4 py-2 text-sm font-medium text-white">
          Retry
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <PerformanceHeader data={payload} />
      <MetricGrid data={payload} />
      <TradesFilters data={payload} />
      <EquityChart data={payload} />
      <BreakdownSection data={payload} />
      <TradesTable data={payload} />
      <ExplainBlock />
      <AdminDebugPanel data={payload} />
    </div>
  );
}
