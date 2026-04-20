"use client";

import { useMemo } from "react";
import type { AnalysisChartData } from "@/lib/analysis/types";
import { mapCandlesToSvgPoints } from "@/lib/analysis/chart-mappers";

type Props = {
  data: AnalysisChartData;
  height?: number;
};

export function AnalysisChart({ data, height = 420 }: Props) {
  const rows = useMemo(() => mapCandlesToSvgPoints(data.candles), [data.candles]);
  const width = 1000;
  const barStep = rows.length > 0 ? width / rows.length : 0;
  const barWidth = Math.max(2, barStep * 0.58);

  return (
    <svg
      role="img"
      aria-label="Candlestick chart with key support and resistance levels"
      viewBox={`0 0 ${width} ${height}`}
      className="h-[360px] w-full rounded-xl border border-[var(--line)] bg-[var(--surface-elevated)]"
      preserveAspectRatio="none"
    >
      {rows.map((row, index) => {
        const x = (index + 0.5) * barStep;
        const openY = row.openY * height;
        const closeY = row.closeY * height;
        const highY = row.highY * height;
        const lowY = row.lowY * height;
        const y = Math.min(openY, closeY);
        const h = Math.max(1.5, Math.abs(closeY - openY));
        const color = row.bullish ? "#4ade80" : "#f87171";
        return (
          <g key={index}>
            <line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth={1} opacity={0.9} />
            <rect x={x - barWidth / 2} y={y} width={barWidth} height={h} fill={color} opacity={0.85} rx={1} />
          </g>
        );
      })}
      {data.zones.map((zone) => {
        const min = Math.min(...data.candles.map((c) => c.low));
        const max = Math.max(...data.candles.map((c) => c.high));
        const range = Math.max(1e-8, max - min);
        const y1 = (1 - (zone.priceMax - min) / range) * height;
        const y2 = (1 - (zone.priceMin - min) / range) * height;
        return (
          <g key={zone.id}>
            <rect x={0} y={Math.min(y1, y2)} width={width} height={Math.max(2, Math.abs(y2 - y1))}
              fill={zone.type === "RESISTANCE" ? "rgba(248,113,113,0.10)" : "rgba(74,222,128,0.10)"} />
            <text x={8} y={Math.min(y1, y2) - 4} fill="#a7b4c8" fontSize="10">{zone.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
