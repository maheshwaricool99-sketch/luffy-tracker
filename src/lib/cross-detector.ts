import { KlinePoint } from "@/features/market/types";

export type MAType = "EMA" | "SMA";
export type CrossType = "golden" | "death" | "none";
export type SignalState =
  | "No Signal"
  | "Early Cross"
  | "Awaiting Confirmation"
  | "Confirmed"
  | "Strong Trend"
  | "Weak / Risky"
  | "Invalidated";

export type CrossDetectorSettings = {
  fastPeriod: number;
  slowPeriod: number;
  maType: MAType;
};

export type ValidationResult = {
  isValid: boolean;
  checks: string[];
  failed: string[];
  riskFlags: string[];
};

export type CrossLevels = {
  resistance: number;
  support: number;
  swingHigh: number;
  swingLow: number;
  maRetestZone: [number, number];
  breakoutLevel: number;
  invalidationLevel: number;
};

export type Projection = {
  bullishPath: number[];
  bearishPath: number[];
  continuationRange: [number, number];
  pullbackZone: [number, number];
};

export type CrossAnalysis = {
  overview: string[];
  quality: string[];
  trend: string[];
  risk: string[];
  invalidation: string[];
  expected: string[];
};

export type CrossDetectorResult = {
  symbol: string;
  timeframe: string;
  crossType: CrossType;
  crossIndex: number | null;
  recentCrosses: number;
  state: SignalState;
  score: number;
  confidence: number;
  qualityLabel: "Strong" | "Balanced" | "Weak";
  barsSinceCross: number | null;
  livePrice: number;
  rsi: number;
  macd: { line: number; signal: number; histogram: number };
  volumeRatio: number;
  slope: { fast: number; slow: number };
  chop: { isChoppy: boolean; atrPct: number; maDistancePct: number; recentCrosses: number };
  levels: CrossLevels;
  projection: Projection;
  validation: ValidationResult;
  analysis: CrossAnalysis;
  summary: string;
};

type Structure = {
  higherLow: boolean;
  lowerHigh: boolean;
  breakout: boolean;
  breakdown: boolean;
};

type CrossoverResult = {
  type: CrossType;
  index: number | null;
  barsSince: number | null;
  recentCrosses: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lastNumeric(series: Array<number | null>) {
  for (let index = series.length - 1; index >= 0; index -= 1) {
    const value = series[index];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

export function calculateMA(values: number[], period: number, type: MAType): Array<number | null> {
  const result: Array<number | null> = Array.from({ length: values.length }, () => null);
  if (period < 2 || values.length === 0) {
    return result;
  }

  if (type === "SMA") {
    for (let index = period - 1; index < values.length; index += 1) {
      const slice = values.slice(index - period + 1, index + 1);
      result[index] = average(slice);
    }
    return result;
  }

  const multiplier = 2 / (period + 1);
  let ema = average(values.slice(0, period));
  result[period - 1] = ema;

  for (let index = period; index < values.length; index += 1) {
    ema = (values[index] - ema) * multiplier + ema;
    result[index] = ema;
  }
  return result;
}

export function calculateSlope(series: Array<number | null>, lookback = 6) {
  const latestIndex = series.length - 1;
  const latest = series[latestIndex];
  if (typeof latest !== "number" || !Number.isFinite(latest)) {
    return 0;
  }
  const prevIndex = Math.max(0, latestIndex - lookback);
  const prev = series[prevIndex];
  if (typeof prev !== "number" || !Number.isFinite(prev)) {
    return 0;
  }
  return (latest - prev) / Math.max(1e-8, Math.abs(prev));
}

export function detectCrossover(fast: Array<number | null>, slow: Array<number | null>): CrossoverResult {
  const lastIndex = Math.min(fast.length, slow.length) - 1;
  let detectedType: CrossType = "none";
  let detectedIndex: number | null = null;
  let recentCrosses = 0;

  for (let index = 1; index <= lastIndex; index += 1) {
    const prevFast = fast[index - 1];
    const prevSlow = slow[index - 1];
    const nowFast = fast[index];
    const nowSlow = slow[index];
    if (
      typeof prevFast !== "number" ||
      typeof prevSlow !== "number" ||
      typeof nowFast !== "number" ||
      typeof nowSlow !== "number"
    ) {
      continue;
    }

    const crossedUp = prevFast <= prevSlow && nowFast > nowSlow;
    const crossedDown = prevFast >= prevSlow && nowFast < nowSlow;
    if (crossedUp || crossedDown) {
      if (index >= lastIndex - 28) {
        recentCrosses += 1;
      }
      detectedType = crossedUp ? "golden" : "death";
      detectedIndex = index;
    }
  }

  return {
    type: detectedType,
    index: detectedIndex,
    barsSince: detectedIndex === null ? null : lastIndex - detectedIndex,
    recentCrosses,
  };
}

function calculateRSI(closes: number[], period = 14) {
  if (closes.length < period + 2) {
    return 50;
  }
  let gains = 0;
  let losses = 0;
  for (let index = closes.length - period; index < closes.length; index += 1) {
    const diff = closes[index] - closes[index - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  if (losses === 0) {
    return 100;
  }
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function calculateMACD(closes: number[]) {
  const ema12 = calculateMA(closes, 12, "EMA");
  const ema26 = calculateMA(closes, 26, "EMA");
  const macdSeries = closes.map((_, index) => {
    const a = ema12[index];
    const b = ema26[index];
    if (typeof a !== "number" || typeof b !== "number") {
      return null;
    }
    return a - b;
  });
  const macdNumeric = macdSeries.map((value) => (typeof value === "number" ? value : 0));
  const signalSeries = calculateMA(macdNumeric, 9, "EMA");
  const line = lastNumeric(macdSeries) ?? 0;
  const signal = lastNumeric(signalSeries) ?? 0;
  return { line, signal, histogram: line - signal };
}

function calculateATRPercent(klines: KlinePoint[], period = 14) {
  if (klines.length < period + 2) {
    return 0;
  }
  const trs: number[] = [];
  for (let index = klines.length - period; index < klines.length; index += 1) {
    const current = klines[index];
    const prevClose = klines[index - 1]?.close ?? current.close;
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prevClose),
      Math.abs(current.low - prevClose),
    );
    trs.push(tr);
  }
  const atr = average(trs);
  const latest = klines[klines.length - 1]?.close ?? 1;
  return atr / Math.max(1e-8, latest);
}

export function detectChop(input: {
  fast: Array<number | null>;
  slow: Array<number | null>;
  klines: KlinePoint[];
  recentCrosses: number;
}) {
  const current = input.klines[input.klines.length - 1];
  const fastNow = lastNumeric(input.fast) ?? current?.close ?? 0;
  const slowNow = lastNumeric(input.slow) ?? current?.close ?? 0;
  const maDistancePct = Math.abs(fastNow - slowNow) / Math.max(1e-8, current?.close ?? 1);
  const atrPct = calculateATRPercent(input.klines, 14);
  const isChoppy = maDistancePct < 0.0017 || atrPct < 0.003 || input.recentCrosses >= 3;
  return { isChoppy, maDistancePct, atrPct, recentCrosses: input.recentCrosses };
}

export function detectStructure(klines: KlinePoint[]): Structure {
  const lookback = klines.slice(-28);
  if (lookback.length < 10) {
    return { higherLow: false, lowerHigh: false, breakout: false, breakdown: false };
  }

  const lows = lookback.map((item) => item.low);
  const highs = lookback.map((item) => item.high);
  const close = lookback[lookback.length - 1].close;
  const prevClose = lookback[Math.max(0, lookback.length - 6)].close;
  const lowWindowA = Math.min(...lows.slice(-10, -5));
  const lowWindowB = Math.min(...lows.slice(-5));
  const highWindowA = Math.max(...highs.slice(-10, -5));
  const highWindowB = Math.max(...highs.slice(-5));

  return {
    higherLow: lowWindowB > lowWindowA,
    lowerHigh: highWindowB < highWindowA,
    breakout: close > Math.max(...highs.slice(0, -2)) && close > prevClose,
    breakdown: close < Math.min(...lows.slice(0, -2)) && close < prevClose,
  };
}

export function calculateLevels(klines: KlinePoint[], fastNow: number, slowNow: number, bias: CrossType): CrossLevels {
  const recent = klines.slice(-80);
  const current = recent[recent.length - 1]?.close ?? 0;
  const highs = recent.map((item) => item.high);
  const lows = recent.map((item) => item.low);
  const swingHigh = Math.max(...highs.slice(-24));
  const swingLow = Math.min(...lows.slice(-24));
  const resistanceCandidates = highs.filter((value) => value > current).sort((a, b) => a - b);
  const supportCandidates = lows.filter((value) => value < current).sort((a, b) => b - a);
  const resistance = resistanceCandidates[0] ?? swingHigh;
  const support = supportCandidates[0] ?? swingLow;
  const zoneLow = Math.min(fastNow, slowNow) * 0.998;
  const zoneHigh = Math.max(fastNow, slowNow) * 1.002;
  const breakoutLevel = bias === "golden" ? resistance : support;
  const invalidationLevel = bias === "golden" ? Math.min(swingLow, zoneLow * 0.998) : Math.max(swingHigh, zoneHigh * 1.002);

  return {
    resistance,
    support,
    swingHigh,
    swingLow,
    maRetestZone: [zoneLow, zoneHigh],
    breakoutLevel,
    invalidationLevel,
  };
}

export function validateSignal(input: {
  cross: CrossoverResult;
  crossType: CrossType;
  price: number;
  fastNow: number;
  slowNow: number;
  slopeFast: number;
  slopeSlow: number;
  volumeRatio: number;
  chop: ReturnType<typeof detectChop>;
  structure: Structure;
  rsi: number;
  macd: { line: number; signal: number };
  overextended: boolean;
}): ValidationResult {
  const checks: string[] = [];
  const failed: string[] = [];
  const riskFlags: string[] = [];

  if (input.cross.index !== null) checks.push("Cross confirmed on closed candle");
  else failed.push("No confirmed crossover");

  if (input.crossType === "golden") {
    if (input.slopeFast > 0.0006) checks.push("Fast MA slope upward");
    else failed.push("Fast MA slope too weak");

    if (Math.abs(input.slopeSlow) > 0.00015) checks.push("Slow MA not flat");
    else failed.push("Slow MA too flat");

    if (input.price > input.fastNow && input.price > input.slowNow) checks.push("Price above both MAs");
    else if (input.price > Math.min(input.fastNow, input.slowNow)) checks.push("Price reclaiming MA zone");
    else failed.push("Price not aligned above MA structure");

    if (input.volumeRatio >= 1) checks.push("Volume >= average");
    else failed.push("Volume below average");

    if (!input.chop.isChoppy) checks.push("Market not choppy");
    else failed.push("Choppy / ranging market");

    if (input.structure.higherLow || input.structure.breakout) checks.push("Structure confirmation (HL/Breakout)");
    else failed.push("No higher-low/breakout structure");

    if (input.rsi > 50 && input.rsi < 74) checks.push("RSI aligned");
    else failed.push("RSI outside preferred bullish zone");

    if (input.macd.line >= input.macd.signal) checks.push("MACD bullish alignment");
    else failed.push("MACD not bullish");
  } else if (input.crossType === "death") {
    if (input.slopeFast < -0.0006) checks.push("Fast MA slope downward");
    else failed.push("Fast MA slope too weak");

    if (Math.abs(input.slopeSlow) > 0.00015) checks.push("Slow MA not flat");
    else failed.push("Slow MA too flat");

    if (input.price < input.fastNow && input.price < input.slowNow) checks.push("Price below both MAs");
    else if (input.price < Math.max(input.fastNow, input.slowNow)) checks.push("Price rejecting MA zone");
    else failed.push("Price not aligned below MA structure");

    if (input.volumeRatio >= 1) checks.push("Volume >= average");
    else failed.push("Volume below average");

    if (!input.chop.isChoppy) checks.push("Market not choppy");
    else failed.push("Choppy / ranging market");

    if (input.structure.lowerHigh || input.structure.breakdown) checks.push("Structure confirmation (LH/Breakdown)");
    else failed.push("No lower-high/breakdown structure");

    if (input.rsi < 50 && input.rsi > 26) checks.push("RSI aligned");
    else failed.push("RSI outside preferred bearish zone");

    if (input.macd.line <= input.macd.signal) checks.push("MACD bearish alignment");
    else failed.push("MACD not bearish");
  } else {
    failed.push("No directional crossover");
  }

  if (input.overextended) {
    riskFlags.push("Price overextended from MA zone");
  } else {
    checks.push("Not overextended");
  }

  const isValid = failed.length <= 1 && checks.length >= 6 && !input.chop.isChoppy;
  return { isValid, checks, failed, riskFlags };
}

export function scoreSignal(input: {
  cross: CrossoverResult;
  crossType: CrossType;
  slopeFast: number;
  slopeSlow: number;
  maDistancePct: number;
  priceVsMA: number;
  volumeRatio: number;
  rsi: number;
  macdHistogram: number;
  structureStrength: number;
  chopPenalty: number;
  overextensionPenalty: number;
  validation: ValidationResult;
}) {
  if (input.crossType === "none") {
    return 0;
  }
  const recency = input.cross.barsSince === null ? 0 : clamp(1 - input.cross.barsSince / 18, 0, 1);
  const slopeScore = clamp(Math.abs(input.slopeFast) * 1200, 0, 1);
  const slowSlopeScore = clamp(Math.abs(input.slopeSlow) * 900, 0, 1);
  const distanceScore = clamp(input.maDistancePct / 0.01, 0, 1);
  const positionScore = clamp(input.priceVsMA, 0, 1);
  const volumeScore = clamp(input.volumeRatio / 1.8, 0, 1);
  const rsiScore = clamp(1 - Math.abs((input.crossType === "golden" ? 60 : 40) - input.rsi) / 40, 0, 1);
  const macdScore = clamp(Math.abs(input.macdHistogram) * 200, 0, 1);
  const validationBonus = clamp(input.validation.checks.length / 10, 0, 1);

  let score =
    recency * 12 +
    slopeScore * 14 +
    slowSlopeScore * 8 +
    distanceScore * 10 +
    positionScore * 10 +
    volumeScore * 11 +
    rsiScore * 9 +
    macdScore * 8 +
    input.structureStrength * 10 +
    validationBonus * 8;

  score -= input.chopPenalty * 17;
  score -= input.overextensionPenalty * 12;
  score = clamp(score, 0, 100);
  return Math.round(score);
}

function resolveSignalState(input: {
  crossType: CrossType;
  barsSince: number | null;
  validation: ValidationResult;
  score: number;
  invalidated: boolean;
}) {
  if (input.crossType === "none") return "No Signal";
  if (input.invalidated) return "Invalidated";
  if ((input.barsSince ?? 99) <= 2) return "Early Cross";
  if (!input.validation.isValid && input.score < 52) return "Weak / Risky";
  if (!input.validation.isValid) return "Awaiting Confirmation";
  if (input.score >= 85) return "Strong Trend";
  if (input.score >= 70) return "Confirmed";
  return "Awaiting Confirmation";
}

function qualityFromScore(score: number): "Strong" | "Balanced" | "Weak" {
  if (score >= 78) return "Strong";
  if (score >= 58) return "Balanced";
  return "Weak";
}

function buildProjection(input: {
  crossType: CrossType;
  price: number;
  atrPct: number;
  levels: CrossLevels;
}): Projection {
  const baseStep = Math.max(0.0025, input.atrPct * 1.55);
  const bullishPath = Array.from({ length: 8 }, (_, index) => input.price * (1 + baseStep * (index + 1) * 0.45 + Math.sin(index / 1.6) * baseStep * 0.2));
  const bearishPath = Array.from({ length: 8 }, (_, index) => input.price * (1 - baseStep * (index + 1) * 0.42 + Math.sin(index / 1.4) * baseStep * 0.2));
  const continuationRange: [number, number] =
    input.crossType === "golden"
      ? [input.price * (1 + baseStep * 1.8), Math.max(input.levels.resistance, input.price * (1 + baseStep * 3.8))]
      : [Math.min(input.levels.support, input.price * (1 - baseStep * 3.8)), input.price * (1 - baseStep * 1.8)];
  const pullbackZone: [number, number] = input.levels.maRetestZone;

  return { bullishPath, bearishPath, continuationRange, pullbackZone };
}

export function generateAnalysis(input: {
  symbol: string;
  timeframe: string;
  crossType: CrossType;
  state: SignalState;
  score: number;
  validation: ValidationResult;
  levels: CrossLevels;
  projection: Projection;
  rsi: number;
  volumeRatio: number;
}): CrossAnalysis {
  const direction = input.crossType === "golden" ? "bullish" : input.crossType === "death" ? "bearish" : "neutral";
  const expectedRange = input.projection.continuationRange.map((value) => value.toLocaleString(undefined, { maximumFractionDigits: value > 1 ? 2 : 5 })).join(" - ");
  return {
    overview: [
      `${input.symbol} on ${input.timeframe} is printing a ${input.crossType === "none" ? "no-cross" : input.crossType === "golden" ? "Golden Cross" : "Death Cross"} profile.`,
      `State is ${input.state} with ${input.score}% confidence score.`,
      `Signal direction currently reads ${direction}.`,
    ],
    quality: [
      `Validation checks passed: ${input.validation.checks.length}`,
      `Failed conditions: ${input.validation.failed.length}`,
      `Volume confirmation ratio: ${input.volumeRatio.toFixed(2)}x average`,
    ],
    trend: [
      `RSI is ${input.rsi.toFixed(1)}, aligned for ${direction} continuation.`,
      `Breakout / breakdown level: ${input.levels.breakoutLevel.toLocaleString(undefined, { maximumFractionDigits: input.levels.breakoutLevel > 1 ? 2 : 5 })}`,
      `MA retest zone: ${input.levels.maRetestZone.map((value) => value.toLocaleString(undefined, { maximumFractionDigits: value > 1 ? 2 : 5 })).join(" - ")}`,
    ],
    risk: [
      ...input.validation.riskFlags,
      input.validation.failed.length > 0 ? "Some confluence conditions are still missing." : "No major structural risk flags right now.",
    ],
    invalidation: [
      `Setup invalidates beyond ${input.levels.invalidationLevel.toLocaleString(undefined, { maximumFractionDigits: input.levels.invalidationLevel > 1 ? 2 : 5 })}.`,
      "If chop expands and volume drops, downgrade setup to wait mode.",
    ],
    expected: [
      `Projected continuation range: ${expectedRange}.`,
      `Primary projection assumes controlled retest then directional follow-through.`,
    ],
  };
}

export function runCrossDetector(input: {
  symbol: string;
  timeframe: string;
  klines: KlinePoint[];
  settings: CrossDetectorSettings;
}): CrossDetectorResult {
  const closed = input.klines.filter((item) => item.isClosed);
  const source = closed.length > 40 ? closed : input.klines;
  const closes = source.map((item) => item.close);
  const volumes = source.map((item) => item.volume);
  const price = source[source.length - 1]?.close ?? 0;

  const fast = calculateMA(closes, input.settings.fastPeriod, input.settings.maType);
  const slow = calculateMA(closes, input.settings.slowPeriod, input.settings.maType);
  const crossover = detectCrossover(fast, slow);
  const fastNow = lastNumeric(fast) ?? price;
  const slowNow = lastNumeric(slow) ?? price;
  const slopeFast = calculateSlope(fast, 6);
  const slopeSlow = calculateSlope(slow, 10);
  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);
  const volumeRatio = (() => {
    const recent = average(volumes.slice(-5));
    const baseline = average(volumes.slice(-24, -5));
    return baseline > 0 ? recent / baseline : 1;
  })();
  const chop = detectChop({ fast, slow, klines: source, recentCrosses: crossover.recentCrosses });
  const structure = detectStructure(source);
  const overextended = Math.abs(price - fastNow) / Math.max(1e-8, price) > 0.045;

  const validation = validateSignal({
    cross: crossover,
    crossType: crossover.type,
    price,
    fastNow,
    slowNow,
    slopeFast,
    slopeSlow,
    volumeRatio,
    chop,
    structure,
    rsi,
    macd: { line: macd.line, signal: macd.signal },
    overextended,
  });
  const levels = calculateLevels(source, fastNow, slowNow, crossover.type);
  const invalidated =
    crossover.type === "golden"
      ? price < levels.invalidationLevel
      : crossover.type === "death"
      ? price > levels.invalidationLevel
      : false;
  const structureStrength = clamp(
    (structure.higherLow ? 0.45 : 0) +
      (structure.lowerHigh ? 0.45 : 0) +
      (structure.breakout ? 0.55 : 0) +
      (structure.breakdown ? 0.55 : 0),
    0,
    1,
  );
  const score = scoreSignal({
    cross: crossover,
    crossType: crossover.type,
    slopeFast,
    slopeSlow,
    maDistancePct: chop.maDistancePct,
    priceVsMA:
      crossover.type === "golden"
        ? price > fastNow && price > slowNow
          ? 1
          : price > Math.min(fastNow, slowNow)
          ? 0.6
          : 0.2
        : crossover.type === "death"
        ? price < fastNow && price < slowNow
          ? 1
          : price < Math.max(fastNow, slowNow)
          ? 0.6
          : 0.2
        : 0,
    volumeRatio,
    rsi,
    macdHistogram: macd.histogram,
    structureStrength,
    chopPenalty: chop.isChoppy ? 1 : clamp(chop.recentCrosses / 4, 0, 1),
    overextensionPenalty: overextended ? 1 : 0,
    validation,
  });
  const state = resolveSignalState({
    crossType: crossover.type,
    barsSince: crossover.barsSince,
    validation,
    score,
    invalidated,
  });
  const projection = buildProjection({
    crossType: crossover.type,
    price,
    atrPct: chop.atrPct,
    levels,
  });
  const analysis = generateAnalysis({
    symbol: input.symbol,
    timeframe: input.timeframe,
    crossType: crossover.type,
    state,
    score,
    validation,
    levels,
    projection,
    rsi,
    volumeRatio,
  });

  return {
    symbol: input.symbol,
    timeframe: input.timeframe,
    crossType: crossover.type,
    crossIndex: crossover.index,
    recentCrosses: crossover.recentCrosses,
    state,
    score,
    confidence: score,
    qualityLabel: qualityFromScore(score),
    barsSinceCross: crossover.barsSince,
    livePrice: price,
    rsi,
    macd,
    volumeRatio,
    slope: { fast: slopeFast, slow: slopeSlow },
    chop,
    levels,
    projection,
    validation,
    analysis,
    summary:
      state === "Strong Trend" || state === "Confirmed"
        ? `${crossover.type === "golden" ? "Golden" : "Death"} cross is trade-worthy with ${score}% confidence.`
        : `Cross context is ${state.toLowerCase()} and requires additional confirmation.`,
  };
}
