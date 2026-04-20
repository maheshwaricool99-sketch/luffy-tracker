"use client";

import { useMemo, useState } from "react";
import type { PerformanceApiResponse } from "@/lib/performance/types";
import { formatR, formatTimestamp } from "../lib/formatters";
import { PremiumGate } from "./premium-gate";

export function EquityChart({ data }: { data: PerformanceApiResponse }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const points = data.equityCurve;

  const chart = useMemo(() => {
    if (points.length === 0) return null;
    const width = 960;
    const height = 280;
    const pad = 20;
    const values = points.map((point) => point.value);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);
    const range = Math.max(1, max - min);
    const zeroY = pad + ((max - 0) / range) * (height - pad * 2);
    const mapped = points.map((point, index) => {
      const x = pad + (index / Math.max(1, points.length - 1)) * (width - pad * 2);
      const y = pad + ((max - point.value) / range) * (height - pad * 2);
      return { ...point, x, y };
    });
    const path = mapped.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
    const area = `${path} L ${width - pad} ${height - pad} L ${pad} ${height - pad} Z`;
    return { width, height, pad, zeroY, mapped, path, area };
  }, [points]);

  return (
    <PremiumGate
      locked={data.meta.locked.equityCurve}
      title={data.meta.role === "GUEST" ? "Login to unlock full performance analytics" : "Unlock real-time performance analytics"}
      detail={data.meta.role === "GUEST"
        ? "See full history, live updates, confidence analytics, and detailed breakdowns."
        : "See full equity curve, expectancy, full trade history, and detailed strategy breakdowns."}
      primaryLabel={data.meta.role === "GUEST" ? "Login" : "Upgrade to Premium"}
      primaryHref={data.meta.role === "GUEST" ? "/login?next=%2Fperformance" : "/pricing"}
      secondaryLabel={data.meta.role === "GUEST" ? "View Premium Plans" : undefined}
      secondaryHref={data.meta.role === "GUEST" ? "/pricing" : undefined}
    >
      <section className="rounded-[28px] border border-white/10 bg-[#091321] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#7DD3FC]">Equity Curve</div>
            <h2 className="mt-2 text-xl font-semibold text-[#F3F7FF]">Cumulative R over finalized closed trades</h2>
          </div>
          {activeIndex !== null && chart ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-right">
              <div className="text-xs text-[#7E91A7]">{formatTimestamp(chart.mapped[activeIndex].time)}</div>
              <div className="text-sm font-semibold text-[#F3F7FF]">{formatR(chart.mapped[activeIndex].value)}</div>
            </div>
          ) : null}
        </div>
        {chart ? (
          <div className="mt-5 overflow-x-auto">
            <svg
              viewBox={`0 0 ${chart.width} ${chart.height}`}
              className="h-[260px] min-w-[740px] w-full"
              onMouseLeave={() => setActiveIndex(null)}
              onMouseMove={(event) => {
                if (data.meta.locked.equityCurve) return;
                const bounds = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
                const relativeX = ((event.clientX - bounds.left) / bounds.width) * chart.width;
                const nearest = chart.mapped.reduce((best, point, index) => (
                  Math.abs(point.x - relativeX) < Math.abs(chart.mapped[best].x - relativeX) ? index : best
                ), 0);
                setActiveIndex(nearest);
              }}
            >
              <defs>
                <linearGradient id="performanceCurveFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(125,211,252,0.32)" />
                  <stop offset="100%" stopColor="rgba(125,211,252,0)" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width={chart.width} height={chart.height} rx="24" fill="rgba(10,18,30,0.45)" />
              <line x1={chart.pad} y1={chart.zeroY} x2={chart.width - chart.pad} y2={chart.zeroY} stroke="rgba(148,163,184,0.45)" strokeDasharray="4 6" />
              <path d={chart.area} fill="url(#performanceCurveFill)" />
              <path d={chart.path} fill="none" stroke="rgba(125,211,252,1)" strokeWidth="3" strokeLinecap="round" />
              {activeIndex !== null ? (
                <circle cx={chart.mapped[activeIndex].x} cy={chart.mapped[activeIndex].y} r="5" fill="#F3F7FF" stroke="rgba(125,211,252,1)" strokeWidth="3" />
              ) : null}
            </svg>
          </div>
        ) : (
          <div className="mt-5 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-[14px] text-[#9AAFC6]">
            No closed trades yet. Performance metrics will appear once the first signals complete their lifecycle.
          </div>
        )}
      </section>
    </PremiumGate>
  );
}
