import { Card } from "@/components/ui/card";
import type { Market, OnChainMetrics } from "@/lib/analysis/types";
import { formatCompactUsd } from "@/lib/analysis/formatters";

type Props = { data: OnChainMetrics | null; market: Market; entitlement: boolean };

export function OnChainCard({ data, market, entitlement }: Props) {
  return (
    <Card title={market === "CRYPTO" ? "On-Chain" : "Institutional Flow"} subtitle="Flow, ownership, and participation diagnostics.">
      {!entitlement || !data ? <p className="text-sm text-[var(--text-soft)]">Advanced flow metrics are premium-only.</p> : (
        <div className="space-y-2 text-sm text-[var(--text-soft)]">
          <p>Netflow 24h: <span className="font-medium text-[var(--text-strong)]">{formatCompactUsd(data.exchangeNetflow24hUsd)}</span></p>
          <p>Whale tx: <span className="font-medium text-[var(--text-strong)]">{data.whaleTxCount24h ?? "—"}</span></p>
          <p>Summary: {data.summary ?? "—"}</p>
          <p className="text-xs text-[var(--text-muted)]">Source: {data.source}</p>
        </div>
      )}
    </Card>
  );
}
