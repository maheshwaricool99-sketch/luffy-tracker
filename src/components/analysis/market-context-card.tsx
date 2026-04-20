import { Card } from "@/components/ui/card";
import type { Market, MarketContext } from "@/lib/analysis/types";
import { formatPercent } from "@/lib/analysis/formatters";

type Props = { context: MarketContext; market: Market };

export function MarketContextCard({ context, market }: Props) {
  return (
    <Card title="Market Context" subtitle="Macro and cross-asset context impacting setup reliability.">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg border border-[var(--line)] p-2"><p className="text-xs text-[var(--text-muted)]">Trend</p><p>{context.trend}</p></div>
        <div className="rounded-lg border border-[var(--line)] p-2"><p className="text-xs text-[var(--text-muted)]">Volatility</p><p>{context.volatility}</p></div>
        <div className="rounded-lg border border-[var(--line)] p-2"><p className="text-xs text-[var(--text-muted)]">Sentiment</p><p>{context.sentimentLabel}</p></div>
        <div className="rounded-lg border border-[var(--line)] p-2"><p className="text-xs text-[var(--text-muted)]">Liquidity</p><p>{context.liquidity}</p></div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {(context.heatmap ?? []).slice(0, 6).map((item) => (
          <div key={item.symbol} className="rounded-md border border-[var(--line)] px-2 py-1 text-xs">
            <p className="font-medium">{item.symbol}</p>
            <p className={item.changePct >= 0 ? "text-emerald-300" : "text-rose-300"}>{formatPercent(item.changePct)}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-[var(--text-muted)]">{market} context feed</p>
    </Card>
  );
}
