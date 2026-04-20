import type { PerformanceApiResponse } from "@/lib/performance/types";
import { formatCount, formatR, formatWinRate } from "../lib/formatters";
import { PremiumGate } from "./premium-gate";

export function BreakdownSection({ data }: { data: PerformanceApiResponse }) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <BreakdownCard
        title="By Market"
        subtitle="Closed trade quality across supported markets."
        rows={data.breakdown.byMarket.map((row) => ({
          key: row.market,
          label: row.market,
          closedTrades: row.closedTrades,
          winRate: row.winRate,
          expectancy: row.expectancy,
        }))}
      />
      <PremiumGate
        locked={data.meta.locked.byConfidence}
        title="Login to unlock full performance analytics"
        detail="See full history, live updates, confidence analytics, and detailed breakdowns."
        primaryLabel="Login"
        primaryHref="/login?next=%2Fperformance"
        secondaryLabel="View Premium Plans"
        secondaryHref="/pricing"
      >
        <BreakdownCard
          title="Confidence Buckets"
          subtitle="Does higher confidence actually translate into better outcomes?"
          rows={data.breakdown.byConfidence.map((row) => ({
            key: row.bucket,
            label: row.bucket,
            closedTrades: row.closedTrades,
            winRate: row.winRate,
            expectancy: row.expectancy,
          }))}
        />
      </PremiumGate>
      <PremiumGate
        locked={data.meta.locked.byClass}
        title={data.meta.role === "FREE" ? "Unlock real-time performance analytics" : "Login to unlock full performance analytics"}
        detail={data.meta.role === "FREE"
          ? "See full equity curve, expectancy, full trade history, and detailed strategy breakdowns."
          : "See full history, live updates, confidence analytics, and detailed breakdowns."}
        primaryLabel={data.meta.role === "FREE" ? "Upgrade to Premium" : "Login"}
        primaryHref={data.meta.role === "FREE" ? "/pricing" : "/login?next=%2Fperformance"}
        secondaryLabel={data.meta.role === "FREE" ? undefined : "View Premium Plans"}
        secondaryHref={data.meta.role === "FREE" ? undefined : "/pricing"}
      >
        <BreakdownCard
          title="By Class"
          subtitle="Strategy quality split by elite, strong, and watchlist flow."
          rows={data.breakdown.byClass.map((row) => ({
            key: row.class,
            label: row.class,
            closedTrades: row.closedTrades,
            winRate: row.winRate,
            expectancy: row.expectancy,
          }))}
        />
      </PremiumGate>
    </div>
  );
}

function BreakdownCard({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: Array<{ key: string; label: string; closedTrades: number; winRate: number | null; expectancy: number | null }>;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[#091321] p-5">
      <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#7DD3FC]">{title}</div>
      <p className="mt-2 text-[14px] leading-6 text-[#96AABD]">{subtitle}</p>
      <div className="mt-5 space-y-3">
        {rows.length > 0 ? rows.map((row) => (
          <div key={row.key} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[#F3F7FF]">{row.label}</div>
              <div className="text-xs text-[#8698AE]">{formatCount(row.closedTrades)} closed</div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <MetricMini label="Win Rate" value={formatWinRate(row.winRate)} />
              <MetricMini label="Expectancy" value={row.expectancy === null ? "Unavailable" : formatR(row.expectancy)} />
            </div>
          </div>
        )) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-[#93A7BD]">
            No closed trades available for this breakdown yet.
          </div>
        )}
      </div>
    </section>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-[#70839B]">{label}</div>
      <div className="mt-1 font-semibold text-[#EAF1FB]">{value}</div>
    </div>
  );
}
