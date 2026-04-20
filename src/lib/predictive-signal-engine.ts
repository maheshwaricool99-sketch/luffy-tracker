import { Difficulty, SignalItem, formatPrice } from "@/lib/app-data";
import { getRecentTicks, getUnifiedPrices, PriceTick, UnifiedPrice } from "@/lib/price-engine";

const SIGNAL_CAP: Record<Difficulty, number> = {
  easy: 20,
  medium: 16,
  advanced: 24,
  expert: 18,
  ace: 12,
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pct(from: number, to: number) {
  if (!Number.isFinite(from) || from <= 0 || !Number.isFinite(to) || to <= 0) return 0;
  return ((to - from) / from) * 100;
}

function ema(values: number[], period: number) {
  if (values.length === 0) return 0;
  const alpha = 2 / (period + 1);
  let result = values[0] ?? 0;
  for (let i = 1; i < values.length; i += 1) {
    result = values[i] * alpha + result * (1 - alpha);
  }
  return result;
}

function stddev(values: number[]) {
  if (values.length < 2) return 0;
  const mean = avg(values);
  const variance = avg(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function rsi(values: number[], period = 14) {
  if (values.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i += 1) {
    const delta = values[i] - values[i - 1];
    if (delta > 0) gains += delta;
    if (delta < 0) losses += Math.abs(delta);
  }
  if (losses === 0) return 100;
  const rs = gains / Math.max(losses, 1e-9);
  return 100 - (100 / (1 + rs));
}

function nearestCluster(values: number[], tolerancePct: number) {
  if (values.length < 3) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  let best = 1;
  for (let i = 0; i < sorted.length; i += 1) {
    let count = 1;
    for (let j = i + 1; j < sorted.length; j += 1) {
      const distancePct = Math.abs(sorted[j] - sorted[i]) / Math.max(sorted[i], 1e-9) * 100;
      if (distancePct <= tolerancePct) count += 1;
    }
    best = Math.max(best, count);
  }
  return best;
}

function formatTs(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function computeVolumeDelta(ticks: PriceTick[]) {
  const withVolume = ticks.filter((tick) => Number.isFinite(tick.volume24h));
  if (withVolume.length >= 2) {
    return Math.max(0, (withVolume[withVolume.length - 1].volume24h ?? 0) - (withVolume[0].volume24h ?? 0));
  }
  return ticks.length;
}

function deriveFeatures(symbol: string, live: UnifiedPrice) {
  const ticks1h = getRecentTicks(symbol, 60 * 60_000);
  const ticks15m = ticks1h.filter((tick) => tick.timestamp >= Date.now() - 15 * 60_000);
  const ticks5m = ticks1h.filter((tick) => tick.timestamp >= Date.now() - 5 * 60_000);
  const prices1h = ticks1h.map((tick) => tick.price);
  const prices15m = ticks15m.map((tick) => tick.price);
  const prices5m = ticks5m.map((tick) => tick.price);
  const baselinePrice = prices15m[0] ?? live.price;
  const move15mPct = pct(baselinePrice, live.price);
  const range15mPct =
    prices15m.length > 0
      ? pct(Math.min(...prices15m), Math.max(...prices15m))
      : 0;
  const range5mPct =
    prices5m.length > 0
      ? pct(Math.min(...prices5m), Math.max(...prices5m))
      : 0;
  const bbWidthPct = prices15m.length >= 8
    ? ((stddev(prices15m) * 4) / Math.max(avg(prices15m), 1e-9)) * 100
    : 100;
  const prior15m = ticks1h.filter((tick) => tick.timestamp >= Date.now() - 30 * 60_000 && tick.timestamp < Date.now() - 15 * 60_000);
  const priorRangePct = prior15m.length > 0
    ? pct(Math.min(...prior15m.map((tick) => tick.price)), Math.max(...prior15m.map((tick) => tick.price)))
    : range15mPct;
  const rangeCompression = priorRangePct > 0 ? 1 - (range15mPct / Math.max(priorRangePct, 0.0001)) : 0;
  const volume15m = computeVolumeDelta(ticks15m);
  const priorVolume15m = computeVolumeDelta(prior15m);
  const volumeGrowth = priorVolume15m > 0 ? volume15m / Math.max(priorVolume15m, 1e-9) : ticks15m.length / Math.max(prior15m.length || 1, 1);
  const clusterHighs = nearestCluster(prices15m.slice(-8), 0.35);
  const clusterLows = nearestCluster(prices15m.slice(-8), 0.35);
  const emaFast = ema(prices5m, 3);
  const emaSlow = ema(prices5m, 8);
  const ema1hFast = ema(prices1h, 12);
  const ema1hSlow = ema(prices1h, 30);
  const momentumShift = emaFast > emaSlow && Math.abs(pct(ema1hSlow || live.price, ema1hFast || live.price)) < 1.2;
  const activityDivergence = volumeGrowth > 1.1 && Math.abs(move15mPct) < 2.2;
  const rsiValue = rsi(prices15m.length >= 15 ? prices15m : prices1h.slice(-20));
  const accumulationScore = Math.round(clamp(0, 25,
    (bbWidthPct <= 1.2 ? 10 : bbWidthPct <= 2 ? 6 : 2) +
    clamp(0, 8, rangeCompression * 10) +
    (Math.abs(move15mPct) <= 2 ? 4 : 0) +
    (activityDivergence ? 3 : 0),
  ));
  const volumeAnomalyScore = Math.round(clamp(0, 20,
    (activityDivergence ? 8 : 0) +
    clamp(0, 8, (volumeGrowth - 1) * 8) +
    (ticks5m.length > Math.max(5, Math.floor(ticks15m.length / 4)) ? 4 : 0),
  ));
  const structureScore = Math.round(clamp(0, 20,
    (clusterHighs >= 3 ? 7 : 0) +
    (clusterLows >= 3 ? 7 : 0) +
    (range15mPct <= 3 ? 4 : 0) +
    (rangeCompression > 0.2 ? 2 : 0),
  ));
  const momentumShiftScore = Math.round(clamp(0, 15,
    (momentumShift ? 10 : 0) +
    (emaFast > emaSlow ? 3 : 0) +
    (Math.abs(move15mPct) < 3 ? 2 : 0),
  ));
  const catalystScore = Math.round(clamp(0, 10,
    (bbWidthPct <= 1 ? 4 : 0) +
    (clusterHighs >= 3 || clusterLows >= 3 ? 3 : 0) +
    (momentumShift ? 3 : 0),
  ));

  const volumeSpikePeaked = ticks15m.length >= 6 && ticks5m.length > 0 && computeVolumeDelta(ticks5m) < volume15m * 0.2;
  const riskPenalty = Math.round(clamp(0, 20,
    (Math.abs(move15mPct) > 5 ? 10 : 0) +
    (Math.abs(move15mPct) > 8 ? 6 : 0) +
    (rsiValue > 75 ? 4 : 0) +
    (live.ageMs > 2_000 ? 4 : 0) +
    (volumeSpikePeaked ? 4 : 0),
  ));
  const score = Math.round(clamp(0, 100,
    accumulationScore +
    volumeAnomalyScore +
    structureScore +
    momentumShiftScore +
    catalystScore -
    riskPenalty,
  ));
  const preMoveRange = prices15m.length > 0
    ? `${formatPrice(Math.min(...prices15m))} - ${formatPrice(Math.max(...prices15m))}`
    : `${formatPrice(live.price)} - ${formatPrice(live.price)}`;
  const expectedMoveLeadMinutes = Math.round(clamp(5, 45, 40 - accumulationScore - Math.floor(momentumShiftScore / 2)));
  const breakoutProbability = clamp(0, 100, score);
  const lateSignal = Math.abs(move15mPct) > 3.5;
  const triggerable =
    score > 70 &&
    Math.abs(move15mPct) <= 5 &&
    Math.abs(move15mPct) < 8 &&
    !volumeSpikePeaked &&
    rsiValue <= 75 &&
    live.ageMs <= 3_000;

  return {
    ticks15m,
    move15mPct,
    range15mPct,
    rsiValue,
    accumulationScore,
    volumeAnomalyScore,
    structureScore,
    momentumShiftScore,
    catalystScore,
    riskPenalty,
    score,
    preMoveRange,
    breakoutProbability,
    expectedMoveLeadMinutes,
    signalTiming: lateSignal ? "LATE SIGNAL" as const : "EARLY SIGNAL" as const,
    accumulationDetectedAt: formatTs((ticks15m[0] ?? ticks1h[0])?.timestamp ?? Date.now()),
    triggerable,
  };
}

export async function debugPredictiveFeatures(symbol: string) {
  const prices = await getUnifiedPrices([symbol]);
  const live = prices.get(symbol);
  if (!live) return null;
  return deriveFeatures(symbol, live);
}

function buildTradeLevels(price: number, bias: "bullish" | "bearish", range15mPct: number) {
  const rangeFactor = Math.max(0.0075, range15mPct / 100);
  const stop = bias === "bullish"
    ? price * (1 - rangeFactor * 0.7)
    : price * (1 + rangeFactor * 0.7);
  const target = bias === "bullish"
    ? price * (1 + rangeFactor * 2.2)
    : price * (1 - rangeFactor * 2.2);
  const entryLo = bias === "bullish" ? price * 0.998 : price * 1.002;
  const entryHi = bias === "bullish" ? price * 1.002 : price * 0.998;
  return {
    entry: `${formatPrice(Math.min(entryLo, entryHi))} - ${formatPrice(Math.max(entryLo, entryHi))}`,
    stop: formatPrice(stop),
    target: formatPrice(target),
  };
}

export async function buildPredictiveSignalsForUniverse(
  level: Difficulty,
  timeframe: string,
  symbolUniverse: string[],
): Promise<SignalItem[]> {
  const prices = await getUnifiedPrices(symbolUniverse);
  const rows: SignalItem[] = [];

  for (const symbol of symbolUniverse) {
    const live = prices.get(symbol);
    if (!live || live.price <= 0 || live.ageMs > 3_000) continue;
    const features = deriveFeatures(symbol, live);
    if (!features.triggerable) continue;

    const bias = features.momentumShiftScore >= 7 || features.move15mPct >= 0 ? "bullish" : "bearish";
    const levels = buildTradeLevels(live.price, bias, features.range15mPct);
    rows.push({
      symbol,
      timeframe,
      setup: features.structureScore >= 12 ? "Liquidity Coil" : features.accumulationScore >= 15 ? "Accumulation Compression" : "Early Momentum Shift",
      bias,
      score: features.score,
      pumpProbabilityScore: features.score,
      state: features.score >= 78 ? "Ready" : "Early",
      entry: levels.entry,
      stop: levels.stop,
      target: levels.target,
      reason: [
        `PumpProbability ${features.score}/100`,
        `Accum ${features.accumulationScore} | Volume ${features.volumeAnomalyScore} | Structure ${features.structureScore} | Shift ${features.momentumShiftScore} | Risk -${features.riskPenalty}`,
        `${features.signalTiming} | ${live.source} | age ${Math.round(live.ageMs)}ms`,
      ],
      preMoveRange: features.preMoveRange,
      accumulationDetectedAt: features.accumulationDetectedAt,
      breakoutProbability: features.breakoutProbability,
      expectedMoveLeadMinutes: features.expectedMoveLeadMinutes,
      signalTiming: features.signalTiming,
      priceSource: live.source,
      priceAgeMs: live.ageMs,
      featureBreakdown: {
        accumulationScore: features.accumulationScore,
        volumeAnomalyScore: features.volumeAnomalyScore,
        structureScore: features.structureScore,
        momentumShiftScore: features.momentumShiftScore,
        catalystScore: features.catalystScore,
        riskPenalty: features.riskPenalty,
      },
      source: "prediction",
    });
  }

  return rows
    .sort((a, b) => (b.pumpProbabilityScore ?? b.score) - (a.pumpProbabilityScore ?? a.score))
    .slice(0, SIGNAL_CAP[level]);
}
