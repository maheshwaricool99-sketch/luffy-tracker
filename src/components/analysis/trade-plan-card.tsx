import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TradePlan } from "@/lib/analysis/types";
import { formatPrice } from "@/lib/analysis/formatters";

type Props = {
  tradePlan: TradePlan;
  currentPrice: number | null;
  entitlement: boolean;
};

export function TradePlanCard({ tradePlan, currentPrice, entitlement }: Props) {
  const tps = entitlement ? tradePlan.takeProfits : tradePlan.takeProfits.filter((tp) => tp.level === 1);

  return (
    <Card title="Trade Plan" subtitle="Entry, stop, targets, and invalidation framework.">
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-[var(--line)] p-3"><p className="text-xs text-[var(--text-muted)]">Direction</p><p className="font-semibold">{tradePlan.direction}</p></div>
          <div className="rounded-lg border border-[var(--line)] p-3"><p className="text-xs text-[var(--text-muted)]">Current</p><p className="font-semibold">{formatPrice(currentPrice)}</p></div>
          <div className="rounded-lg border border-[var(--line)] p-3"><p className="text-xs text-[var(--text-muted)]">Entry</p><p className="font-semibold">{formatPrice(tradePlan.entryPrice)}</p></div>
          <div className="rounded-lg border border-[var(--line)] p-3"><p className="text-xs text-[var(--text-muted)]">Stop</p><p className="font-semibold">{formatPrice(tradePlan.stopLoss)}</p></div>
        </div>
        <div className="space-y-1">
          {tps.map((tp) => (
            <div key={tp.level} className="flex items-center justify-between rounded-md border border-[var(--line)] px-3 py-2 text-sm">
              <span>TP{tp.level}</span>
              <span>{formatPrice(tp.price)} · {tp.rMultiple.toFixed(1)}R</span>
            </div>
          ))}
        </div>
        {!entitlement ? <p className="text-xs text-[var(--text-muted)]">TP2/TP3 and trailing stop are premium-only.</p> : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="h-10" variant="secondary">Add to Watchlist</Button>
          <Button className="h-10" variant="secondary">Set Alert</Button>
        </div>
      </div>
    </Card>
  );
}
