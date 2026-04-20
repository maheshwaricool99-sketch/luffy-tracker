import { DataTable } from "@/components/primitives/DataTable";

export function DiagnosticTable({
  rows,
}: {
  rows: Array<{ id: string; market: string; reason: string; count: number }>;
}) {
  return (
    <DataTable
      rows={rows}
      rowKey={(row) => row.id}
      emptyMessage="No diagnostic events in the current window."
      cardRender={(row) => (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-[#70809A]">Market</div>
              <div className="mt-1 text-sm font-semibold text-[#F3F7FF]">{row.market.toUpperCase()}</div>
            </div>
            <div className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-semibold text-[#F3F7FF]">
              {row.count}
            </div>
          </div>
          <div className="mt-3 text-[11px] uppercase tracking-[0.12em] text-[#70809A]">Reason</div>
          <div className="mt-1 text-[13px] leading-5 text-[#A7B4C8]">{row.reason}</div>
        </div>
      )}
      columns={[
        { key: "market", label: "Market", width: "100px", render: (row) => <span className="text-[#F3F7FF]">{row.market.toUpperCase()}</span> },
        { key: "reason", label: "Reason", render: (row) => <span>{row.reason}</span> },
        { key: "count", label: "Count", width: "96px", align: "right", render: (row) => row.count.toString() },
      ]}
    />
  );
}
