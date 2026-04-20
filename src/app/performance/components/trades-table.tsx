import type { PerformanceApiResponse } from "@/lib/performance/types";
import { formatDuration, formatPercent, formatPrice, formatR, formatTimestamp } from "../lib/formatters";

export function TradesTable({ data }: { data: PerformanceApiResponse }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[#091321] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#7DD3FC]">Closed Trades</div>
          <h2 className="mt-2 text-xl font-semibold text-[#F3F7FF]">Finalized outcomes only</h2>
          <p className="mt-2 text-[14px] leading-6 text-[#96AABD]">
            Open positions are excluded from every headline metric on this page.
          </p>
        </div>
        <div className="text-right text-sm text-[#90A4BA]">
          <div>{data.meta.totalTrades} trades in scope</div>
          <div>Page {data.meta.filters.page} of {data.meta.totalPages}</div>
        </div>
      </div>
      {data.trades.length > 0 ? (
        <div className="mt-5">
          <div className="grid gap-3 md:hidden">
            {data.trades.map((trade) => (
              <article key={trade.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-[#D7E2EF]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[#F4F8FD]">{trade.symbol}</div>
                    <div className="mt-1 text-[12px] text-[#90A4BA]">{trade.market} · {trade.direction}</div>
                  </div>
                  <OutcomeBadge outcome={trade.outcome} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <TradeMetric label="Entry" value={formatPrice(trade.entry)} />
                  <TradeMetric label="Exit" value={formatPrice(trade.exit)} />
                  <TradeMetric label="Result %" value={formatPercent(trade.resultPct, 1)} />
                  <TradeMetric label="R" value={formatR(trade.r)} />
                  <TradeMetric label="Confidence" value={String(trade.confidence)} />
                  <TradeMetric label="Time Held" value={formatDuration(trade.timeHeldMs)} />
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-[#90A4BA]">
                  <span>Closed {formatTimestamp(trade.closedAt)}</span>
                  <span>{trade.sourceLabel ?? trade.source}</span>
                </div>
                {data.admin ? (
                  <div className="mt-3 rounded-xl border border-white/[0.05] bg-[#0F1D31] px-3 py-2 text-[11px] text-[#A8BCD0]">
                    <div className="font-mono">{trade.signalId ?? trade.id}</div>
                    <div className="mt-1">Opened {formatTimestamp(trade.openedAt)}</div>
                    <div>{trade.ingestionAt ? `Ingested ${formatTimestamp(trade.ingestionAt)}` : "Ingestion unavailable"}</div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[1120px] w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-[#6D8398]">
                  {["Symbol", "Market", "Direction", "Entry", "Exit", "Result %", "R", "Confidence", "Time Held", "Outcome", "Closed At", ...(data.admin ? ["Signal ID", "Source", "Opened At", "Ingestion At"] : [])].map((label) => (
                    <th key={label} className="border-b border-white/8 px-3 py-3 font-medium">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.trades.map((trade) => (
                  <tr key={trade.id} className="text-[#D7E2EF]">
                    <td className="border-b border-white/[0.06] px-3 py-3 font-semibold text-[#F4F8FD]">{trade.symbol}</td>
                    <td className="border-b border-white/[0.06] px-3 py-3">{trade.market}</td>
                    <td className="border-b border-white/[0.06] px-3 py-3">{trade.direction}</td>
                    <td className="border-b border-white/[0.06] px-3 py-3">{formatPrice(trade.entry)}</td>
                    <td className="border-b border-white/[0.06] px-3 py-3">{formatPrice(trade.exit)}</td>
                    <td className="border-b border-white/[0.06] px-3 py-3">{formatPercent(trade.resultPct, 1)}</td>
                    <td className="border-b border-white/[0.06] px-3 py-3">{formatR(trade.r)}</td>
                    <td className="border-b border-white/[0.06] px-3 py-3">{trade.confidence}</td>
                    <td className="border-b border-white/[0.06] px-3 py-3">{formatDuration(trade.timeHeldMs)}</td>
                    <td className="border-b border-white/[0.06] px-3 py-3"><OutcomeBadge outcome={trade.outcome} /></td>
                    <td className="border-b border-white/[0.06] px-3 py-3">{formatTimestamp(trade.closedAt)}</td>
                    {data.admin ? (
                      <>
                        <td className="border-b border-white/[0.06] px-3 py-3 font-mono text-xs text-[#A8BCD0]">{trade.signalId ?? trade.id}</td>
                        <td className="border-b border-white/[0.06] px-3 py-3">{trade.sourceLabel ?? trade.source}</td>
                        <td className="border-b border-white/[0.06] px-3 py-3">{formatTimestamp(trade.openedAt)}</td>
                        <td className="border-b border-white/[0.06] px-3 py-3">{trade.ingestionAt ? formatTimestamp(trade.ingestionAt) : "--"}</td>
                      </>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-[14px] text-[#9AAFC6]">
          No closed trades yet. Performance metrics will appear once the first signals complete their lifecycle.
        </div>
      )}
    </section>
  );
}

function TradeMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-[#0F1D31] px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.1em] text-[#70809A]">{label}</div>
      <div className="mt-1 text-[13px] font-medium text-[#F4F8FD]">{value}</div>
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const tone = outcome === "TP"
    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
    : outcome === "SL"
      ? "border-rose-400/25 bg-rose-400/10 text-rose-300"
      : "border-amber-400/25 bg-amber-400/10 text-amber-300";
  const label = outcome === "TP" ? "TARGET HIT" : outcome === "SL" ? "STOP HIT" : "TIMEOUT";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] ${tone}`}>{label}</span>;
}
