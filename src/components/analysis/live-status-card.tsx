"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import type { LiveStatus, TradePlan } from "@/lib/analysis/types";
import { formatPrice, formatRelativeTime } from "@/lib/analysis/formatters";
import { useLivePrice } from "@/hooks/use-live-price";

type Props = {
  symbol: string;
  status: LiveStatus;
  tradePlan: TradePlan;
  entitlement: boolean;
};

export function LiveStatusCard({ symbol, status, tradePlan, entitlement }: Props) {
  const stream = useLivePrice(symbol, entitlement);
  const price = stream.price ?? status.currentPrice;
  const entry = tradePlan.entryPrice;
  const distanceToEntryPct = useMemo(() => {
    if (price == null || entry == null || entry === 0) return status.distanceToEntryPct;
    return ((price - entry) / entry) * 100;
  }, [entry, price, status.distanceToEntryPct]);

  return (
    <Card title="Live Status" subtitle="Signal state, price proximity, and feed condition.">
      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Current Price</p>
          <span className={`text-xs ${stream.connected ? "text-emerald-300" : "text-amber-300"}`}>
            {stream.connected ? "Live stream" : "Snapshot"}
          </span>
        </div>
        <p className="terminal-kpi text-2xl font-semibold text-[var(--text-strong)]">{formatPrice(price)}</p>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] p-2.5">
            <p className="text-xs text-[var(--text-soft)]">Status</p>
            <p className="font-medium text-[var(--text-strong)]">{status.status}</p>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] p-2.5">
            <p className="text-xs text-[var(--text-soft)]">Distance to Entry</p>
            <p className="font-medium text-[var(--text-strong)]">
              {distanceToEntryPct != null ? `${distanceToEntryPct.toFixed(2)}%` : "—"}
            </p>
          </div>
        </div>
        <p className="text-xs text-[var(--text-soft)]">
          Updated {status.updatedAt ? formatRelativeTime(status.updatedAt) : "—"}
          {status.staleReason ? ` · ${status.staleReason}` : ""}
        </p>
      </div>
    </Card>
  );
}
