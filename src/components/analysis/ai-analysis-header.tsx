"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AnalysisEntitlements, LiveStatus, Market, Timeframe } from "@/lib/analysis/types";
import { ANALYSIS_TIMEFRAMES } from "@/lib/analysis/constants";
import { formatRelativeTime } from "@/lib/analysis/formatters";

type Props = {
  symbol: string;
  market: Market;
  assetName: string;
  timeframe: Timeframe;
  exchange: string;
  updatedAt: string;
  liveStatus: LiveStatus;
  entitlements: AnalysisEntitlements;
};

export function AiAnalysisHeader({ symbol, market, assetName, timeframe, exchange, updatedAt, liveStatus, entitlements }: Props) {
  const router = useRouter();
  const liveTone = liveStatus.isLive ? "text-emerald-300" : liveStatus.isStale ? "text-amber-300" : "text-[var(--text-soft)]";
  const marketOptions = useMemo(() => {
    if (market === "CRYPTO") return ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BNBUSDT"];
    if (market === "US") return ["AAPL", "MSFT", "NVDA", "TSLA", "SPY"];
    return ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK"];
  }, [market]);

  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">AI Analysis · {assetName}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-soft)]">
            <span className="rounded-md border border-[var(--line)] px-2 py-1">{symbol}</span>
            <span className="rounded-md border border-[var(--line)] px-2 py-1">{market}</span>
            <span className="rounded-md border border-[var(--line)] px-2 py-1">{exchange}</span>
            <span className={liveTone}>{liveStatus.isLive ? "Live" : liveStatus.isStale ? "Delayed" : "Watching"}</span>
            <span>Updated {formatRelativeTime(updatedAt)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            className="h-10 rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] px-3 text-sm"
            value={symbol}
            onChange={(event) => router.push(`/analysis/${event.target.value}?timeframe=${timeframe}`)}
            aria-label="Symbol"
          >
            {marketOptions.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <div className="flex flex-wrap gap-1">
            {ANALYSIS_TIMEFRAMES.map((tf) => (
              <Button
                key={tf}
                variant={tf === timeframe ? "primary" : "secondary"}
                className="h-10 px-3"
                onClick={() => router.push(`/analysis/${symbol}?timeframe=${tf}`)}
              >
                {tf}
              </Button>
            ))}
          </div>
          {entitlements.canCreateAlerts ? <Button className="h-10" variant="secondary">Set Alert</Button> : null}
        </div>
      </div>
    </Card>
  );
}
