"use client";

import { useMemo } from "react";
import type { IntelligenceSignal } from "@/lib/intelligence/types";

function MiniSparklineSvg({ points, isLong }: { points: { t: string; p: number }[]; isLong: boolean }) {
  const width = 120;
  const height = 36;
  const pad = 2;

  const prices = points.map((pt) => pt.p);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const coords = points.map((pt, i) => {
    const x = pad + (i / (points.length - 1)) * (width - pad * 2);
    const y = pad + ((max - pt.p) / range) * (height - pad * 2);
    return `${x},${y}`;
  });

  const color = isLong ? "#34D399" : "#F87171";
  const pathD = `M ${coords.join(" L ")}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <path d={pathD} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <path d={`${pathD} L ${width - pad},${height - pad} L ${pad},${height - pad} Z`} fill={color} opacity="0.06" />
    </svg>
  );
}

function ConfidenceMeter({ value }: { value: number }) {
  const color = value >= 80 ? "#34D399" : value >= 65 ? "#60A5FA" : value >= 50 ? "#FBBF24" : "#9CA3AF";
  const circumference = 2 * Math.PI * 14;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative flex h-9 w-9 items-center justify-center">
      <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
        <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
        <circle
          cx="18" cy="18" r="14"
          fill="none" stroke={color} strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}

function RRBar({ rr }: { rr: number }) {
  const pct = Math.min(100, (rr / 4) * 100);
  const color = rr >= 2.5 ? "bg-emerald-400" : rr >= 1.5 ? "bg-sky-400" : "bg-amber-400";
  return (
    <div className="flex flex-col gap-0.5">
      <div className="h-1 w-16 rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] tabular-nums text-[#70809A]">R/R {rr.toFixed(1)}x</span>
    </div>
  );
}

interface SignalMiniChartProps {
  signal: IntelligenceSignal;
}

export function SignalMiniChart({ signal }: SignalMiniChartProps) {
  const isLong = signal.direction === "LONG";
  const hasSparkline = signal.sparkline.length >= 3;
  const percentChange = signal.percentChange;

  const changeColor = percentChange === null ? "text-[#70809A]" : percentChange >= 0 ? "text-emerald-400" : "text-rose-400";
  const changeLabel = percentChange === null ? null : `${percentChange >= 0 ? "+" : ""}${percentChange.toFixed(2)}%`;

  return (
    <div className="px-4 py-2.5 border-b border-white/[0.05]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {hasSparkline ? (
            <MiniSparklineSvg points={signal.sparkline} isLong={isLong} />
          ) : (
            <div className="flex h-9 w-[120px] items-center justify-center rounded-lg bg-white/[0.03] text-[10px] text-[#70809A]">
              No sparkline
            </div>
          )}
          {changeLabel && (
            <span className={`text-[12px] font-semibold tabular-nums ${changeColor}`}>{changeLabel}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ConfidenceMeter value={signal.isPremiumLocked ? 0 : signal.confidence} />
          {!signal.tradePlan.locked && signal.tradePlan.riskReward !== null && (
            <RRBar rr={signal.tradePlan.riskReward} />
          )}
        </div>
      </div>
    </div>
  );
}
