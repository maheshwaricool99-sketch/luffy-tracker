"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/app-data";
import { KlinePoint } from "@/features/market/types";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MouseEvent, ReactNode } from "react";

export function buildMarketHref(path: string, params: URLSearchParams) {
  const q = params.toString();
  return q ? `${path}?${q}` : path;
}

export function BiasBadge({ bias }: { bias: "bullish" | "bearish" | "neutral" }) {
  return <Badge variant={bias === "bullish" ? "bullish" : bias === "bearish" ? "bearish" : "premium"}>{bias}</Badge>;
}

export function StatusPill({ label }: { label: string }) {
  const lower = label.toLowerCase();
  const variant = lower.includes("win") || lower.includes("ready") || lower.includes("active") ? "bullish" : lower.includes("loss") || lower.includes("avoid") || lower.includes("invalid") ? "bearish" : "premium";
  return <Badge variant={variant}>{label}</Badge>;
}

export function MetricCard({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <Card className="p-0">
      <div className="space-y-1 px-4 py-3.5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
        <p className="terminal-kpi text-xl font-semibold text-[var(--text-strong)]">{value}</p>
        {sub ? <div className="text-xs text-[var(--text-soft)]">{sub}</div> : null}
      </div>
    </Card>
  );
}

export function PageHero({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_24px_80px_rgba(2,8,20,0.45)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Personal Futures Intelligence</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-strong)] md:text-3xl">{title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-[var(--text-soft)]">{subtitle}</p>
        </div>
        {action}
      </div>
    </div>
  );
}

export function LinkButton({ href, children, variant = "secondary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <Link href={href}>
      <Button variant={variant}>{children}</Button>
    </Link>
  );
}

export function AnalysisSymbolLink({
  symbol,
  timeframe,
  className,
  children,
}: {
  symbol: string;
  timeframe: string;
  className?: string;
  children?: ReactNode;
}) {
  const href = `/analysis?pair=${symbol}&timeframe=${timeframe}&tf=${timeframe}`;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Prevent parent row handlers from overriding symbol navigation.
    event.stopPropagation();
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        "underline decoration-sky-300/45 decoration-1 underline-offset-2 hover:text-sky-200 hover:decoration-sky-200",
        className,
      )}
    >
      {children ?? symbol}
    </Link>
  );
}

export function SignalScore({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(34,197,94,0.9),rgba(56,189,248,0.9))]" style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-semibold text-[var(--text-strong)]">{score}</span>
    </div>
  );
}

export function TinyReasonList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-1 text-[11px] text-[var(--text-soft)]">
          {item}
        </span>
      ))}
    </div>
  );
}

export function SimpleSpark({ values }: { values: number[] }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="h-24 w-full">
      <polyline fill="none" stroke="rgba(56,189,248,0.9)" strokeWidth="2.2" points={points} />
    </svg>
  );
}

export type ChartViewKey = "price" | "ema" | "sr" | "zones" | "signals";
export type ChartFooterKey = "predictionPath" | "keyLevels" | "entryZone" | "targets" | "invalidation";

export function MiniChart({
  price,
  resistance,
  support,
  equilibrium,
  projection,
  projectionAlt = [],
  swingHigh,
  swingLow,
  fvg,
  ema = { ema20: 0, ema50: 0, ema200: 0 },
  candles = [],
  timeframeOptions = ["1m", "5m", "15m", "1h", "4h", "1D"],
  selectedTimeframe = "4h",
  onTimeframeChange,
  viewToggles = { price: true, ema: true, sr: true, zones: true, signals: true },
  onToggleView,
  footerToggles = { predictionPath: true, keyLevels: true, entryZone: true, targets: true, invalidation: true },
  onToggleFooter,
  invalidationLevel,
  label,
}: {
  price: number;
  resistance: number[];
  support: number[];
  equilibrium: number;
  projection: number[];
  projectionAlt?: number[];
  swingHigh: number;
  swingLow: number;
  fvg: [number, number];
  ema?: { ema20: number; ema50: number; ema200: number };
  candles?: KlinePoint[];
  timeframeOptions?: string[];
  selectedTimeframe?: string;
  onTimeframeChange?: (timeframe: string) => void;
  viewToggles?: Record<ChartViewKey, boolean>;
  onToggleView?: (key: ChartViewKey) => void;
  footerToggles?: Record<ChartFooterKey, boolean>;
  onToggleFooter?: (key: ChartFooterKey) => void;
  invalidationLevel?: number;
  label?: string;
}) {
  const sourceCandles =
    candles.length >= 8
      ? candles.slice(-72)
      : Array.from({ length: 48 }, (_, index) => {
          const progress = index / 47;
          const base = price * (0.988 + progress * 0.014 + Math.sin(index / 3.1) * 0.003);
          const open = base * (1 + Math.sin(index / 3.6) * 0.0016);
          const close = base * (1 + Math.cos(index / 2.8) * 0.0015);
          const high = Math.max(open, close) * 1.0017;
          const low = Math.min(open, close) * 0.9983;
          return { open, high, low, close, openTime: index, closeTime: index + 1, volume: 0, isClosed: true };
        });
  const closes = sourceCandles.map((item) => item.close);
  const ema20Series = closes.map((_, index) => {
    const start = Math.max(0, index - 7);
    const slice = closes.slice(start, index + 1);
    return slice.reduce((acc, value) => acc + value, 0) / slice.length;
  });
  const ema50Series = closes.map((_, index) => {
    const start = Math.max(0, index - 15);
    const slice = closes.slice(start, index + 1);
    return slice.reduce((acc, value) => acc + value, 0) / slice.length;
  });
  const ema200Series = closes.map((_, index) => {
    const start = Math.max(0, index - 28);
    const slice = closes.slice(start, index + 1);
    return slice.reduce((acc, value) => acc + value, 0) / slice.length;
  });

  const candleHigh = Math.max(...sourceCandles.map((item) => item.high));
  const candleLow = Math.min(...sourceCandles.map((item) => item.low));
  const candleRange = Math.max(1e-8, candleHigh - candleLow);
  const projectionClampMin = candleLow - candleRange * 1.35;
  const projectionClampMax = candleHigh + candleRange * 1.35;
  const clampProjection = (value: number) => Math.max(projectionClampMin, Math.min(projectionClampMax, value));
  const futureRaw = [price, ...projection];
  const future = futureRaw.map(clampProjection);
  const fallbackAltRaw = projectionAlt.length > 0 ? projectionAlt : futureRaw.map((value, index) => value * (1 + Math.sin(index / 1.7) * 0.0018 - 0.0012 * index));
  const fallbackAlt = fallbackAltRaw.map(clampProjection);
  const projectedEnd = future[future.length - 1] ?? price;
  const projectionUp = projectedEnd >= price;
  const valuesRaw = [
    candleLow,
    candleHigh,
    price,
    ...future,
    ...fallbackAlt,
    ...(typeof invalidationLevel === "number" ? [invalidationLevel] : []),
  ].sort((a, b) => a - b);
  const minBase = valuesRaw[0];
  const maxBase = valuesRaw[valuesRaw.length - 1];
  const rangePad = Math.max((maxBase - minBase) * 0.08, Math.abs(price) * 0.0025, 1e-8);
  const min = minBase - rangePad;
  const max = maxBase + rangePad;
  const scale = (v: number) => `${100 - ((v - min) / (max - min)) * 100}%`;
  const normalizeY = (v: number) => 100 - ((v - min) / (max - min)) * 100;
  const toPlotPoints = (series: number[], xStart: number, xEnd: number) =>
    series.map((value, index) => {
      const x = series.length < 2 ? xEnd : xStart + (index / (series.length - 1)) * (xEnd - xStart);
      const y = normalizeY(value);
      return { x, y };
    });
  const toSmoothPath = (series: number[], xStart: number, xEnd: number) => {
    const points = toPlotPoints(series, xStart, xEnd);
    if (points.length === 0) {
      return "";
    }
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y}`;
    }
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let index = 1; index < points.length; index += 1) {
      const prev = points[index - 1];
      const current = points[index];
      const midX = (prev.x + current.x) / 2;
      const midY = (prev.y + current.y) / 2;
      path += ` Q ${prev.x} ${prev.y} ${midX} ${midY}`;
    }
    const last = points[points.length - 1];
    path += ` T ${last.x} ${last.y}`;
    return path;
  };
  const ema20Path = toSmoothPath(ema20Series, 0, 68);
  const ema50Path = toSmoothPath(ema50Series, 0, 68);
  const ema200Path = toSmoothPath(ema200Series, 0, 68);
  const projectedPath = toSmoothPath(future, 68, 100);
  const alternatePath = toSmoothPath(fallbackAlt, 68, 100);
  const projectionPoints = toPlotPoints(future, 68, 100);
  const alternatePoints = toPlotPoints(fallbackAlt, 68, 100);
  const barWidth = Math.max(1.15, 68 / Math.max(26, sourceCandles.length) - 0.25);
  const projectionColor = projectionUp ? "rgba(34,197,94,0.98)" : "rgba(248,113,113,0.98)";
  const projectionDownColor = "rgba(248,113,113,0.98)";
  const projectionUpColor = "rgba(34,197,94,0.98)";
  const primaryDirectionUp = (future[future.length - 1] ?? price) >= price;
  const alternateDirectionUp = (fallbackAlt[fallbackAlt.length - 1] ?? price) >= price;
  const primaryScenario = projectionUp ? "Bullish Projection" : "Bearish Projection";
  const target1 = future[Math.min(3, future.length - 1)] ?? projectedEnd;
  const target2 = projectedEnd;
  const tickValues = Array.from({ length: 6 }, (_, index) => max - ((max - min) * index) / 5);
  const arrowPolygon = (a: { x: number; y: number }, b: { x: number; y: number }, size = 1.25) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.max(1e-6, Math.hypot(dx, dy));
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    const tipX = b.x;
    const tipY = b.y;
    const baseX = tipX - ux * size * 1.6;
    const baseY = tipY - uy * size * 1.6;
    const leftX = baseX + px * size * 0.8;
    const leftY = baseY + py * size * 0.8;
    const rightX = baseX - px * size * 0.8;
    const rightY = baseY - py * size * 0.8;
    return `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`;
  };
  const primaryArrow =
    projectionPoints.length > 1
      ? arrowPolygon(projectionPoints[projectionPoints.length - 2], projectionPoints[projectionPoints.length - 1], 1.3)
      : "";
  const alternateArrow =
    alternatePoints.length > 1
      ? arrowPolygon(alternatePoints[alternatePoints.length - 2], alternatePoints[alternatePoints.length - 1], 1.1)
      : "";

  return (
    <Card title={label ?? "Chart"} subtitle="TradingView-style structure with interpreted projection overlays.">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 text-sm font-semibold text-[var(--text-strong)]">Chart</div>
          {timeframeOptions.map((timeframe) => (
            <Button
              key={timeframe}
              variant={selectedTimeframe === timeframe ? "primary" : "ghost"}
              className="h-7 px-2.5 text-[11px]"
              onClick={() => onTimeframeChange?.(timeframe)}
            >
              {timeframe}
            </Button>
          ))}
          <div className="mx-2 h-4 w-px bg-[var(--line)]" />
          {(["price", "ema", "sr", "zones", "signals"] as ChartViewKey[]).map((key) => (
            <Button
              key={key}
              variant={viewToggles[key] ? "secondary" : "ghost"}
              className="h-7 px-2.5 text-[11px] uppercase"
              onClick={() => onToggleView?.(key)}
            >
              {key}
            </Button>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <button className="h-7 w-7 rounded-md border border-[var(--line)] bg-black/25 text-xs text-[var(--text-soft)]">?</button>
            <button className="h-7 w-7 rounded-md border border-[var(--line)] bg-black/25 text-xs text-[var(--text-soft)]">+</button>
            <button className="h-7 w-7 rounded-md border border-[var(--line)] bg-black/25 text-xs text-[var(--text-soft)]">*</button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-soft)]">
          <span className="rounded-md border border-emerald-300/35 bg-emerald-400/12 px-2 py-1 text-emerald-100">Projection: {projectionUp ? "Uptrend" : "Downtrend"}</span>
          <span className="rounded-md border border-[var(--line)] bg-black/25 px-2 py-1">Current {formatPrice(price)}</span>
          <span className="rounded-md border border-[var(--line)] bg-black/25 px-2 py-1">EMA20 {formatPrice(ema.ema20)}</span>
          <span className="rounded-md border border-[var(--line)] bg-black/25 px-2 py-1">EMA50 {formatPrice(ema.ema50)}</span>
          <span className="rounded-md border border-sky-300/35 bg-sky-400/10 px-2 py-1 text-sky-100">T1 {formatPrice(target1)}</span>
          <span className="rounded-md border border-violet-300/35 bg-violet-400/10 px-2 py-1 text-violet-100">T2 {formatPrice(target2)}</span>
          <span className="rounded-md border border-rose-300/35 bg-rose-400/10 px-2 py-1 text-rose-100">Invalidation {typeof invalidationLevel === "number" ? formatPrice(invalidationLevel) : "-"}</span>
        </div>
        <div className="relative min-h-[760px] overflow-hidden rounded-2xl border border-[var(--line)] bg-[linear-gradient(180deg,rgba(8,14,24,0.96),rgba(8,14,24,0.75))] p-4">
          <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_60%_-10%,rgba(56,189,248,0.14),transparent_35%),linear-gradient(transparent_95%,rgba(255,255,255,0.06)_96%),linear-gradient(90deg,transparent_95%,rgba(255,255,255,0.04)_96%)] bg-[length:auto,100%_52px,72px_100%] opacity-80" />
          {viewToggles.zones && footerToggles.entryZone ? <div className="absolute left-0 right-0 rounded-md border border-emerald-400/30 bg-emerald-400/10" style={{ top: scale(support[0]), bottom: `calc(100% - ${scale(support[1])})` }} /> : null}
          {viewToggles.zones && footerToggles.entryZone ? <div className="absolute left-0 right-0 rounded-md border border-orange-300/20 bg-orange-300/6" style={{ top: scale(fvg[1]), bottom: `calc(100% - ${scale(fvg[0])})` }} /> : null}
          {viewToggles.zones ? <div className="absolute left-0 right-0 rounded-md border border-rose-400/24 bg-rose-400/8" style={{ top: scale(resistance[1]), bottom: `calc(100% - ${scale(resistance[0])})` }} /> : null}
          {viewToggles.sr && footerToggles.keyLevels ? <div className="absolute left-0 right-0 border-t border-dashed border-amber-300/55" style={{ top: scale(swingHigh) }} /> : null}
          {viewToggles.sr && footerToggles.keyLevels ? <div className="absolute left-0 right-0 border-t border-dashed border-sky-300/55" style={{ top: scale(swingLow) }} /> : null}
          {viewToggles.sr ? <div className="absolute left-0 right-0 border-t border-dashed border-sky-400/45" style={{ top: scale(equilibrium) }} /> : null}
          {viewToggles.price ? <div className="absolute left-0 right-0 border-t border-sky-300/50" style={{ top: scale(price) }} /> : null}
          {footerToggles.invalidation && typeof invalidationLevel === "number" ? <div className="absolute left-0 right-0 border-t border-rose-300/55" style={{ top: scale(invalidationLevel) }} /> : null}
          {footerToggles.targets ? <div className="absolute left-0 right-0 border-t border-sky-300/35" style={{ top: scale(target1) }} /> : null}
          {footerToggles.targets ? <div className="absolute left-0 right-0 border-t border-violet-300/35" style={{ top: scale(target2) }} /> : null}
          <div className="absolute bottom-8 top-8 border-l border-dashed border-white/12" style={{ left: "72%" }} />

          <div className="absolute left-8 right-8 top-8 bottom-10">
            <svg viewBox="0 0 100 100" className="h-full w-full">
              {viewToggles.price
                ? sourceCandles.map((item, index) => {
                    const x = sourceCandles.length < 2 ? 34 : (index / (sourceCandles.length - 1)) * 68;
                    const openY = normalizeY(item.open);
                    const closeY = normalizeY(item.close);
                    const highY = normalizeY(item.high);
                    const lowY = normalizeY(item.low);
                    const bullishCandle = item.close >= item.open;
                    return (
                      <g key={`candle-${item.openTime}-${index}`}>
                        <line x1={x} x2={x} y1={highY} y2={lowY} stroke={bullishCandle ? "rgba(34,197,94,0.86)" : "rgba(248,113,113,0.88)"} strokeWidth="0.6" />
                        <rect
                          x={x - barWidth / 2}
                          y={Math.min(openY, closeY)}
                          width={barWidth}
                          height={Math.max(0.7, Math.abs(closeY - openY))}
                          fill={bullishCandle ? "rgba(34,197,94,0.84)" : "rgba(248,113,113,0.86)"}
                          rx="0.16"
                        />
                      </g>
                    );
                  })
                : null}
              {viewToggles.ema ? <path d={ema20Path} fill="none" stroke="rgba(74,222,128,0.9)" strokeWidth="1.0" /> : null}
              {viewToggles.ema ? <path d={ema50Path} fill="none" stroke="rgba(250,204,21,0.86)" strokeWidth="1.0" /> : null}
              {viewToggles.ema ? <path d={ema200Path} fill="none" stroke="rgba(167,139,250,0.82)" strokeWidth="1.0" /> : null}
              {footerToggles.predictionPath ? <path d={projectedPath} fill="none" stroke={primaryDirectionUp ? projectionUpColor : projectionDownColor} strokeWidth="4.3" strokeOpacity="0.22" /> : null}
              {footerToggles.predictionPath ? <path d={projectedPath} fill="none" stroke={primaryDirectionUp ? projectionUpColor : projectionDownColor} strokeWidth="2.4" strokeDasharray="5 4" /> : null}
              {footerToggles.predictionPath ? <path d={alternatePath} fill="none" stroke={alternateDirectionUp ? projectionUpColor : projectionDownColor} strokeWidth="1.8" strokeDasharray="3 4" /> : null}
              {footerToggles.predictionPath && primaryArrow ? <polygon points={primaryArrow} fill={primaryDirectionUp ? projectionUpColor : projectionDownColor} /> : null}
              {footerToggles.predictionPath && alternateArrow ? <polygon points={alternateArrow} fill={alternateDirectionUp ? projectionUpColor : projectionDownColor} opacity="0.9" /> : null}
              {viewToggles.signals ? <circle cx="68" cy={normalizeY(price)} r="1.3" fill={projectionColor} /> : null}
              {viewToggles.signals && footerToggles.targets ? <circle cx="83" cy={normalizeY(projection[Math.min(3, projection.length - 1)] ?? price)} r="1.1" fill="rgba(56,189,248,0.92)" /> : null}
              {viewToggles.signals && footerToggles.targets ? <circle cx="98" cy={normalizeY(projectedEnd)} r="1.1" fill={projectionColor} /> : null}
              {viewToggles.signals ? <polygon points={`68,${normalizeY(price) - 1.8} 69.7,${normalizeY(price) + 1.6} 66.3,${normalizeY(price) + 1.6}`} fill="rgba(56,189,248,0.95)" /> : null}
            </svg>
          </div>

          {footerToggles.keyLevels ? <div className="absolute left-6 top-12 rounded-md border border-amber-300/40 bg-black/35 px-2 py-1 text-[10px] text-amber-100">Swing High {formatPrice(swingHigh)}</div> : null}
          {footerToggles.keyLevels ? <div className="absolute left-6 top-[55%] rounded-md border border-sky-300/40 bg-black/35 px-2 py-1 text-[10px] text-sky-100">Swing Low {formatPrice(swingLow)}</div> : null}
          {footerToggles.entryZone ? <div className="absolute right-6 top-10 rounded-md border border-orange-300/28 bg-orange-300/8 px-2 py-1 text-[10px] text-orange-100">Context FVG {formatPrice(fvg[0])} - {formatPrice(fvg[1])}</div> : null}
          {footerToggles.entryZone ? <div className="absolute right-6 top-[58%] rounded-md border border-emerald-300/35 bg-emerald-300/12 px-2 py-1 text-[10px] text-emerald-100">Demand {formatPrice(support[1])} - {formatPrice(support[0])}</div> : null}
          {footerToggles.targets ? <div className="absolute right-6 top-[40%] rounded-md border border-sky-300/35 bg-sky-300/12 px-2 py-1 text-[10px] text-sky-100">T1 {formatPrice(target1)}</div> : null}
          {footerToggles.targets ? <div className="absolute right-6 top-[32%] rounded-md border border-violet-300/35 bg-violet-300/12 px-2 py-1 text-[10px] text-violet-100">T2 {formatPrice(target2)}</div> : null}
          <div className={`absolute right-5 top-4 rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${projectionUp ? "border-emerald-300/35 bg-emerald-300/12 text-emerald-100" : "border-rose-300/35 bg-rose-300/12 text-rose-100"}`}>
            {primaryScenario}
          </div>
          <div className="absolute right-1 top-8 bottom-10 w-20 flex-col justify-between pr-1 flex">
            {tickValues.map((tick) => (
              <div key={tick} className="text-right text-[10px] text-[var(--text-muted)]">{formatPrice(tick)}</div>
            ))}
          </div>
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Current Price</p>
              <p className="text-lg font-semibold text-[var(--text-strong)]">{formatPrice(price)}</p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-black/30 px-3 py-2 text-right">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Projected Move</p>
              <p className={`text-sm font-semibold ${projectionUp ? "text-emerald-100" : "text-rose-100"}`}>{formatPrice(projectedEnd)}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Eq {formatPrice(equilibrium)}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {([
            ["predictionPath", "Prediction Path"],
            ["keyLevels", "Key Levels"],
            ["entryZone", "Entry Zone"],
            ["targets", "Targets"],
            ["invalidation", "Invalidation"],
          ] as [ChartFooterKey, string][]).map(([key, labelText]) => (
            <button
              key={key}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[11px]",
                footerToggles[key]
                  ? "border-sky-400/45 bg-sky-500/14 text-sky-100"
                  : "border-[var(--line)] bg-black/20 text-[var(--text-soft)]",
              )}
              onClick={() => onToggleFooter?.(key)}
            >
              {labelText}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function NavTabs({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={buildMarketHref(item.href, params)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium",
            pathname === item.href
              ? "border-sky-400/45 bg-sky-500/16 text-sky-100"
              : "border-[var(--line)] bg-white/[0.03] text-[var(--text-soft)] hover:bg-white/[0.06] hover:text-[var(--text-strong)]",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
