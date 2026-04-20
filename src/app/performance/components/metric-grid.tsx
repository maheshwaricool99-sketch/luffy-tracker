import type { PerformanceApiResponse } from "@/lib/performance/types";
import { formatCount, formatR, formatSignedNumber, formatWinRate } from "../lib/formatters";

export function MetricGrid({ data }: { data: PerformanceApiResponse }) {
  const { summary, meta } = data;
  const guestLocked = meta.locked.metrics;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <MetricCard label="Win Rate" value={formatWinRate(summary.winRate)} support={summary.winRate === null ? "Waiting for first finalized outcomes" : "Closed trades only"} delta={summary.winRateChange7d === null ? null : formatSignedNumber(summary.winRateChange7d, 1, "% vs 7d")} locked={guestLocked} />
      <MetricCard label="Expectancy" value={meta.locked.expectancy ? "Premium" : formatR(summary.expectancy)} support={summary.expectancy === null && !meta.locked.expectancy ? "Waiting for first finalized outcomes" : "Average normalized outcome per closed trade"} locked={meta.locked.expectancy} />
      <MetricCard label="Avg R" value={summary.avgR === null || guestLocked ? "Unavailable" : formatR(summary.avgR)} support="Normalized across included outcomes" locked={guestLocked} />
      <MetricCard label="Closed Trades" value={formatCount(summary.closedTrades)} support={summary.closedTrades === 0 ? "Waiting for first finalized outcomes" : `${formatCount(summary.activeTrades)} active trades excluded`} />
      <MetricCard label="Worst Drawdown" value={summary.worstDrawdownR === null || guestLocked ? "Unavailable" : formatR(summary.worstDrawdownR)} support={summary.bestStreak === null ? "Streak data unlocks after closed history builds" : `Best streak ${summary.bestStreak}`} locked={guestLocked} />
    </div>
  );
}

function MetricCard({
  label,
  value,
  support,
  delta,
  locked = false,
}: {
  label: string;
  value: string;
  support: string;
  delta?: string | null;
  locked?: boolean;
}) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,26,40,0.96),rgba(9,18,29,0.96))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <div className="text-[11px] uppercase tracking-[0.16em] text-[#70839B]">{label}</div>
      <div className={`mt-4 text-[2rem] font-semibold tracking-[-0.04em] text-[#F4F8FD] ${locked ? "blur-[2px]" : ""}`}>{value}</div>
      <div className="mt-2 min-h-5 text-[12px] font-medium text-[#7DD3FC]">{delta ?? "\u00A0"}</div>
      <div className="mt-3 text-[13px] leading-6 text-[#93A7BD]">{support}</div>
    </section>
  );
}
