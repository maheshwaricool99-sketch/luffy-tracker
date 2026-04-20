import type { PerformanceApiResponse } from "@/lib/performance/types";
import { formatTimestamp } from "../lib/formatters";

export function AdminDebugPanel({ data }: { data: PerformanceApiResponse }) {
  if (!data.admin) return null;

  return (
    <section className="rounded-[28px] border border-amber-400/20 bg-[linear-gradient(180deg,rgba(49,24,7,0.55),rgba(18,11,7,0.8))] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-amber-300">Admin Audit</div>
          <h2 className="mt-2 text-xl font-semibold text-[#FFF7ED]">Metric provenance and exclusion diagnostics</h2>
        </div>
        <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
          Cache generated {formatTimestamp(data.meta.cache.generatedAt)}
        </div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Panel title="Exclusions">
          <div className="text-2xl font-semibold text-[#FFF7ED]">{data.admin.excludedTradeCount}</div>
          <div className="mt-3 space-y-2 text-sm text-amber-100/90">
            {Object.keys(data.admin.exclusionReasons).length > 0 ? Object.entries(data.admin.exclusionReasons).map(([reason, count]) => (
              <div key={reason} className="flex items-center justify-between gap-3">
                <span>{reason}</span>
                <span>{count}</span>
              </div>
            )) : <div>No excluded finalized rows.</div>}
          </div>
        </Panel>
        <Panel title="Raw Sources">
          <div className="space-y-2 text-sm text-amber-100/90">
            {data.admin.rawSourceBreakdown.map((row) => (
              <div key={row.source} className="flex items-center justify-between gap-3">
                <span>{row.source}</span>
                <span>{row.count}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Provenance">
          <div className="space-y-2 text-sm text-amber-100/90">
            <div>Source table: {data.admin.provenance.sourceTable}</div>
            <div>Closed timestamp: {data.admin.provenance.closedAtField}</div>
            <div>Opened timestamp: {data.admin.provenance.openedAtField}</div>
            <div>{data.admin.provenance.exitComputation}</div>
          </div>
        </Panel>
      </div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-300/15 bg-black/20 p-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-amber-200/80">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
