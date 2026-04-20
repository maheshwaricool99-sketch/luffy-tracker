import { Card } from "@/components/ui/card";
import type { OrderFlowMetrics } from "@/lib/analysis/types";
import { formatCompactUsd } from "@/lib/analysis/formatters";

type Props = { data: OrderFlowMetrics | null; entitlement: boolean };

export function OrderFlowCard({ data, entitlement }: Props) {
  return (
    <Card title="Order Flow" subtitle="Bid/ask pressure, open interest, and liquidation clusters.">
      {!entitlement || !data ? <p className="text-sm text-[var(--text-soft)]">Order-flow diagnostics require Premium.</p> : (
        <div className="space-y-2 text-sm text-[var(--text-soft)]">
          <p>Bid/Ask imbalance: <span className="font-medium text-[var(--text-strong)]">{data.bidAskImbalancePct.toFixed(1)}%</span></p>
          <p>Open interest: <span className="font-medium text-[var(--text-strong)]">{formatCompactUsd(data.openInterestUsd ?? null)}</span></p>
          <div className="space-y-1">
            {data.liquidationClusters.map((cluster, index) => (
              <div key={`${cluster.pricePoint}-${index}`} className="flex items-center justify-between rounded-md border border-[var(--line)] px-2 py-1 text-xs">
                <span>{cluster.side} cluster</span>
                <span>{formatCompactUsd(cluster.usdAmount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
