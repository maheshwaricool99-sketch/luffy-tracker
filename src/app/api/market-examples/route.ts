import { getCandles } from "@/lib/paper-exchange";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type MarketExample = {
  symbol: string;
  label: string;
  source: string;
  timeframe: string;
  current: number;
  changePct: number;
  points: number[];
  status: "Bullish" | "Bearish" | "Neutral";
  summary: string;
  levels: {
    support: number;
    resistance: number;
    trigger?: number;
  };
};

let btcCache: MarketExample | null = null;
let nqCache: MarketExample | null = null;

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ema(values: number[], period: number) {
  if (values.length === 0) return 0;
  const alpha = 2 / (period + 1);
  let current = values[0];
  for (let i = 1; i < values.length; i += 1) {
    current = values[i] * alpha + current * (1 - alpha);
  }
  return current;
}

function summarize(label: string, current: number, ema20: number, ema50: number, resistance: number, support: number, volumeBoost: number) {
  const status: MarketExample["status"] = current > ema20 && ema20 >= ema50
    ? "Bullish"
    : current < ema20 && ema20 <= ema50
      ? "Bearish"
      : "Neutral";
  const summary = status === "Bullish"
    ? `${label} is trading above its short-term trend stack. A clean hold above ${ema20.toFixed(2)} keeps breakout pressure alive, while ${resistance.toFixed(2)} is the nearby trigger level.`
    : status === "Bearish"
      ? `${label} is trading below its short-term trend stack. Reclaiming ${ema20.toFixed(2)} would ease pressure, but losing ${support.toFixed(2)} keeps downside continuation in play.`
      : `${label} is sitting between short-term averages, so structure is balanced. Watch ${support.toFixed(2)} support and ${resistance.toFixed(2)} resistance for the next expansion.`;
  return {
    status,
    summary: `${summary} Volume is running at ${volumeBoost.toFixed(2)}x the recent average.`,
  };
}

async function buildBtcExample(): Promise<MarketExample | null> {
  const candles = await getCandles("BTCUSDT", "15m", 80);
  if (candles.length < 40) return btcCache;
  const closes = candles.map((c) => c.close);
  const highs = candles.slice(-24).map((c) => c.high);
  const lows = candles.slice(-24).map((c) => c.low);
  const volumes = candles.slice(-24).map((c) => c.volume);
  const current = closes.at(-1) ?? 0;
  const first = closes.at(-24) ?? current;
  const changePct = first > 0 ? ((current - first) / first) * 100 : 0;
  const ema20 = ema(closes.slice(-30), 20);
  const ema50 = ema(closes, 50);
  const volumeBoost = avg(volumes.slice(-6)) / Math.max(0.000001, avg(volumes.slice(0, 18)));
  const resistance = Math.max(...highs);
  const support = Math.min(...lows);
  const { status, summary } = summarize("BTC", current, ema20, ema50, resistance, support, volumeBoost);
  const example = {
    symbol: "BTCUSDT",
    label: "Bitcoin futures",
    source: "Binance",
    timeframe: "15m",
    current,
    changePct,
    points: closes.slice(-36),
    status,
    summary,
    levels: { support, resistance, trigger: resistance },
  };
  btcCache = example;
  return example;
}

async function buildNqExample(): Promise<MarketExample | null> {
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/NQ=F?interval=15m&range=2d&includePrePost=true";
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "user-agent": "Mozilla/5.0" },
  }).catch(() => null);
  if (!response || !response.ok) return nqCache;
  const payload = await response.json() as {
    chart?: {
      result?: Array<{
        meta?: { regularMarketPrice?: number };
        timestamp?: number[];
        indicators?: { quote?: Array<{ close?: Array<number | null>; high?: Array<number | null>; low?: Array<number | null>; volume?: Array<number | null> }> };
      }>;
    };
  };
  const result = payload.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const closes = (quote?.close ?? []).filter((value): value is number => Number.isFinite(value));
  const highs = (quote?.high ?? []).filter((value): value is number => Number.isFinite(value));
  const lows = (quote?.low ?? []).filter((value): value is number => Number.isFinite(value));
  const volumes = (quote?.volume ?? []).filter((value): value is number => Number.isFinite(value));
  if (closes.length < 30 || highs.length < 24 || lows.length < 24) return null;
  const current = closes.at(-1) ?? result?.meta?.regularMarketPrice ?? 0;
  const first = closes.at(-24) ?? current;
  const changePct = first > 0 ? ((current - first) / first) * 100 : 0;
  const ema20 = ema(closes.slice(-30), 20);
  const ema50 = ema(closes.slice(-50), 50);
  const resistance = Math.max(...highs.slice(-24));
  const support = Math.min(...lows.slice(-24));
  const recentVol = volumes.slice(-6);
  const baseVol = volumes.slice(-24, -6);
  const volumeBoost = avg(recentVol) / Math.max(0.000001, avg(baseVol));
  const { status, summary } = summarize("NQ futures", current, ema20, ema50, resistance, support, volumeBoost || 1);
  const example = {
    symbol: "NQ=F",
    label: "Nasdaq futures",
    source: "Yahoo Finance",
    timeframe: "15m",
    current,
    changePct,
    points: closes.slice(-36),
    status,
    summary,
    levels: { support, resistance, trigger: resistance },
  };
  nqCache = example;
  return example;
}

export async function GET() {
  const settled = await Promise.allSettled([buildBtcExample(), buildNqExample()]);
  const items = settled.flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : []);
  if (!items.some((item) => item.symbol === "BTCUSDT") && btcCache) items.unshift(btcCache);
  if (!items.some((item) => item.symbol === "NQ=F") && nqCache) items.push(nqCache);
  return NextResponse.json({ items }, {
    headers: {
      "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}
