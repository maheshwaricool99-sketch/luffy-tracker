export type Bias = 'bullish' | 'bearish' | 'neutral';
export type ActionState = 'Ready' | 'Waiting' | 'Early' | 'Active' | 'Avoid';
export type Difficulty = 'easy' | 'medium' | 'advanced' | 'expert' | 'ace';
export type TradeOutcome = 'Win' | 'Loss' | 'Open' | 'Closed' | 'Partial';

export type DifficultyMeta = {
  key: Difficulty;
  label: string;
  short: string;
  description: string;
  riskTone: string;
  scoreFloor: number;
  strategyFocus: string;
  calculation: string[];
  effect: string[];
  bestConditions: string[];
};

export type SignalItem = {
  symbol: string;
  timeframe: string;
  setup: string;
  bias: Bias;
  score: number;
  pumpProbabilityScore?: number;
  state: ActionState;
  entry: string;
  stop: string;
  target: string;
  reason: string[];
  preMoveRange?: string;
  accumulationDetectedAt?: string;
  breakoutProbability?: number;
  expectedMoveLeadMinutes?: number;
  signalTiming?: "EARLY SIGNAL" | "LATE SIGNAL";
  priceSource?: string;
  priceAgeMs?: number;
  featureBreakdown?: {
    accumulationScore: number;
    volumeAnomalyScore: number;
    structureScore: number;
    momentumShiftScore: number;
    catalystScore: number;
    riskPenalty: number;
  };
  source: Difficulty | 'scanner' | 'prediction';
};

export type HistoryTrade = {
  symbol: string;
  timeframe: string;
  strategy: string;
  entry: string;
  stop: string;
  target: string;
  entryTime: string;
  exitTime: string;
  status: TradeOutcome;
  rr: string;
  note: string;
  execution?: {
    source: "paper-exchange" | "simulated";
    side: "LONG" | "SHORT";
    quantity: number;
    orderIds: string[];
    entryFillPrice: number;
    exitFillPrice?: number;
    lastMarkPrice?: number;
    entryFeeUsd: number;
    exitFeeUsd?: number;
    entrySlippageUsd: number;
    exitSlippageUsd?: number;
    realizedPnlUsd?: number;
    realizedPnlPct?: number;
    macroContext?: {
      tensionIndex: number;
      macroBias: "risk_on" | "risk_off" | "neutral";
      volatilityRegime: "low" | "normal" | "high";
      confidenceAdjustmentPct: number;
      positionSizeMultiplier: number;
      blockWeakSignals: boolean;
      allowNewTrades?: boolean;
      allowedBias?: "bullish" | "bearish" | "both";
      minConfidence?: number;
      minNetEdgeR?: number;
      maxOpenTrades?: number;
      reasonTags: string[];
    };
  };
};

export type AnalysisModel = {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  change24h: number;
  bias: Bias;
  confidence: number;
  setupScore: number;
  setupQuality: "Excellent" | "Good" | "Fair";
  action: string;
  modeHint: string;
  summary: string;
  summaryBullets: string[];
  technicals: string[];
  criticalLevels: string[];
  tradeIdeas: string[];
  expectation: string[];
  entryConditions: string[];
  invalidation: string[];
  scenarios: { label: string; probability: number; description: string; trigger: string; bullets: string[] }[];
  plan: {
    entry: [number, number];
    trigger: [number, number];
    stop: number;
    target1: number;
    target2: number;
    rrPrimary: string;
    rrExtended: string;
  };
  levels: {
    resistance: number[];
    support: number[];
    swingHigh: number;
    swingLow: number;
    equilibrium: number;
    projection: number[];
    projectionAlt: number[];
    fvg: [number, number];
    ema20: number;
    ema50: number;
    ema200: number;
    demand: [number, number];
    supply: [number, number];
  };
};

type AnalysisInput = {
  livePrice?: number | null;
  recentCloses?: number[];
};

export const difficultyMeta: DifficultyMeta[] = [
  {
    key: 'easy',
    label: 'Easy Tracker',
    short: 'High-clarity continuation setups',
    description: 'Fewer signals, cleaner execution, strongest trend alignment.',
    riskTone: 'Low Noise',
    scoreFloor: 78,
    strategyFocus: 'Trend-aligned continuation only',
    calculation: [
      'Requires 4h structure confirmation before anything is shown.',
      'Daily bias must support the direction or at least not oppose it.',
      'Only strong ADX, healthy volume, and clean retests are allowed.',
    ],
    effect: [
      'Produces fewer trades but keeps signal quality high.',
      'Usually enters later, after confirmation, with better clarity.',
      'Can miss aggressive reversals because it waits for proof.',
    ],
    bestConditions: ['Trending markets', 'Breakout retests', 'Clean continuation waves'],
  },
  {
    key: 'medium',
    label: 'Medium Tracker',
    short: 'Balanced swing opportunities',
    description: 'More opportunities while keeping structure and confirmation discipline.',
    riskTone: 'Balanced',
    scoreFloor: 70,
    strategyFocus: 'Trend continuation plus strong reversals',
    calculation: [
      'Uses 4h as the main scan timeframe and 1h as refinement.',
      'Reclaims, zone reactions, and confirmed crosses can qualify.',
      'Daily filter still matters, but slight conflict is tolerated.',
    ],
    effect: [
      'Provides a healthy number of setups without flooding the screen.',
      'Good balance between early opportunity and confirmation.',
      'Can include more mixed momentum than Easy.',
    ],
    bestConditions: ['Healthy swings', 'Reclaims after flushes', 'Structured reversals'],
  },
  {
    key: 'advanced',
    label: 'Advanced Tracker',
    short: 'Confluence-heavy technical setups',
    description: 'More tactical logic using liquidity, structure, and multi-timeframe scoring.',
    riskTone: 'Tactical',
    scoreFloor: 64,
    strategyFocus: 'Liquidity + structure + MTF scoring',
    calculation: [
      'Main setup score is blended with higher timeframe alignment and lower timeframe timing.',
      'Liquidity sweeps, FVG returns, and reclaim logic add score.',
      'Risk is reduced when price sits into overhead resistance or weak volume.',
    ],
    effect: [
      'Finds smarter setups than simple crosses or breakouts.',
      'Can surface early reversals before simpler trackers react.',
      'Needs more reading because setups can be more nuanced.',
    ],
    bestConditions: ['Volatile swings', 'Liquidity grabs', 'Retests into imbalance'],
  },
  {
    key: 'expert',
    label: 'Trend Breakout Tracker',
    short: 'Multi-timeframe trend following with breakout confirmation',
    description: 'Higher-timeframe trend filter with lower-timeframe breakout confirmation, RR discipline, and structure-based continuation entries.',
    riskTone: 'Trend Confirmed',
    scoreFloor: 60,
    strategyFocus: 'EMA trend alignment + consolidation breakout + continuation management',
    calculation: [
      'Uses higher timeframe EMA 50 and EMA 200 alignment to define dominant direction.',
      'Waits for lower timeframe range compression and only scores candles that close outside the range with confirmation.',
      'Builds risk/reward from breakout level, invalidation distance, and trend-follow-through quality.',
    ],
    effect: [
      'Focuses on cleaner directional moves instead of frequent mixed-context trades.',
      'Avoids most counter-trend attempts and lets strong moves develop with trailing logic.',
      'Designed to hold continuation trades longer than scalping-style trackers.',
    ],
    bestConditions: ['Established HTF trends', 'Range compression before expansion', 'Volume-backed breakout continuation'],
  },
  {
    key: 'ace',
    label: 'Ace Tracker',
    short: 'Low win-rate, high RR sniper setups',
    description: 'Fewer but asymmetric opportunities designed for outsized RR and strict invalidation.',
    riskTone: 'Asymmetric',
    scoreFloor: 52,
    strategyFocus: 'High RR continuation/reversal inflection entries',
    calculation: [
      'Accepts fewer confirmations when expected RR is materially higher than baseline.',
      'Requires wide target projection with tight invalidation relative to entry structure.',
      'Rejects setups with poor asymmetry even if momentum looks strong.',
    ],
    effect: [
      'Can show lower win-rate by design while targeting larger per-trade payoff.',
      'May hold through more noise before target is reached.',
      'Requires discipline because misses are expected but winners are larger.',
    ],
    bestConditions: ['Expansion phases', 'Post-sweep reversals', 'Breakout continuation with air pockets'],
  },
];

export const trackerOrder: Difficulty[] = ['advanced', 'expert', 'ace'];

export const scannerSymbols = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'LINKUSDT', 'AVAXUSDT', 'APTUSDT', 'ORDERUSDT',
  'BNBUSDT', 'ATOMUSDT', 'ARBUSDT', 'NEARUSDT', 'SUIUSDT', 'INJUSDT', 'SEIUSDT', 'FILUSDT', 'AAVEUSDT', 'MKRUSDT',
  'LTCUSDT', 'BCHUSDT', 'ETCUSDT', 'OPUSDT', 'UNIUSDT', 'DOTUSDT', 'TRXUSDT', 'ICPUSDT', 'TONUSDT', '1000PEPEUSDT',
];
export const aceScannerSymbols = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'LINKUSDT', 'AVAXUSDT', 'APTUSDT', 'BNBUSDT',
  'ATOMUSDT', 'ARBUSDT', 'NEARUSDT', 'SUIUSDT', 'INJUSDT', 'SEIUSDT', 'FILUSDT', 'AAVEUSDT', 'MKRUSDT', 'LTCUSDT',
  'BCHUSDT', 'ETCUSDT', 'OPUSDT', 'UNIUSDT', 'DOTUSDT', 'TRXUSDT', 'ICPUSDT', 'TONUSDT', '1000PEPEUSDT', 'WIFUSDT',
  'ORDIUSDT', 'FETUSDT', 'RUNEUSDT', 'ALGOUSDT', 'HBARUSDT', 'GALAUSDT', 'IMXUSDT', 'DYDXUSDT', 'JUPUSDT', 'TIAUSDT',
  'ENAUSDT', 'PENDLEUSDT', 'SHIBUSDT', 'ONDOUSDT', 'LDOUSDT', 'RNDRUSDT', 'ARUSDT', 'EGLDUSDT', 'SANDUSDT', 'MANAUSDT'
];
const setupPool = ['Golden Cross', 'Breakout Retest', 'Liquidity Sweep', 'FVG Reclaim', 'Range Reversal', 'Trend Continuation'];
const signalUniverseCache = new Map<string, SignalItem[]>();

const notePool = [
  'Daily aligned and 1h supportive.',
  'Volume expansion confirms the move.',
  'Liquidity sweep reclaimed quickly.',
  'Resistance remains close overhead.',
  'Momentum is mixed but trend strength is intact.',
  'Best taken only on candle close confirmation.',
];

function hash(input: string) {
  return input.split('').reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) >>> 0, 7);
}

function priceSeed(symbol: string) {
  const h = hash(symbol);
  if (symbol.startsWith('BTC')) return 68420 + (h % 2200);
  if (symbol.startsWith('ETH')) return 3450 + (h % 220);
  if (symbol.startsWith('SOL')) return 162 + (h % 22);
  if (symbol.startsWith('BNB')) return 610 + (h % 30);
  if (symbol.startsWith('XRP')) return 0.58 + (h % 18) / 100;
  if (symbol.startsWith('ADA')) return 0.44 + (h % 10) / 100;
  if (symbol.startsWith('DOGE')) return 0.14 + (h % 12) / 100;
  if (symbol.startsWith('LINK')) return 14 + (h % 7);
  if (symbol.startsWith('AVAX')) return 28 + (h % 8);
  if (symbol.startsWith('APT')) return 8.4 + (h % 12) / 10;
  return 0.02 + (h % 90) / 1000;
}

export function formatPrice(value: number) {
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (value >= 100) return value.toFixed(2);
  if (value >= 1) return value.toFixed(3);
  return value.toFixed(5);
}

function timeframeFactor(timeframe: string) {
  if (timeframe === '1D') return 1.7;
  if (timeframe === '4h') return 1.25;
  if (timeframe === '1h') return 0.9;
  return 0.65;
}

export function timeframeToMinutes(timeframe: string) {
  const amount = Number(timeframe.slice(0, -1));
  const unit = timeframe.slice(-1).toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0) return 240;
  if (unit === 'm') return amount;
  if (unit === 'h') return amount * 60;
  if (unit === 'd') return amount * 60 * 24;
  return 240;
}

function formatHistoryTimestampLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function getLocalAlignedBarOpenMs(now: Date, timeframeMinutes: number) {
  const safeTf = Math.max(1, timeframeMinutes);
  const anchor = new Date(now);
  anchor.setSeconds(0, 0);
  const minutesSinceMidnight = anchor.getHours() * 60 + anchor.getMinutes();
  const alignedMinutes = Math.floor(minutesSinceMidnight / safeTf) * safeTf;
  anchor.setHours(0, 0, 0, 0);
  return anchor.getTime() + alignedMinutes * 60_000;
}


export function getTrackerUniverseSymbols(level: Difficulty) {
  if (level === "ace") return [...aceScannerSymbols];
  return [...scannerSymbols];
}

export function getTrackerUniverseCount(level: Difficulty) {
  return getTrackerUniverseSymbols(level).length;
}

export function buildSignalsForUniverse(level: Difficulty | 'scanner', timeframe: string, symbolUniverse: string[], cycleSeed = 0) {
  const cacheKey = `${level}:${timeframe}:${cycleSeed}:${symbolUniverse.length}:${symbolUniverse[0] ?? ''}:${symbolUniverse[symbolUniverse.length - 1] ?? ''}`;
  const cached = signalUniverseCache.get(cacheKey);
  if (cached) return cached;

  const meta = difficultyMeta.find((item) => item.key === level);
  const baseFloor = meta?.scoreFloor ?? 68;
  const isAce = level === "ace";
  const visibleSignalCap =
    level === "easy"
      ? 40
      : level === "medium"
      ? 30
      : level === "advanced"
      ? 24
      : level === "scanner"
      ? 18
      : 12;

  const scored = symbolUniverse.map((symbol, index) => {
    const h = hash(`${symbol}:${level}:${timeframe}:${cycleSeed}`);
    const base = priceSeed(symbol);

    if (!isAce) {
      const bias: Bias = h % 9 === 0 ? 'neutral' : h % 2 === 0 ? 'bullish' : 'bearish';
      const rawScore = baseFloor + (h % (100 - baseFloor));
      const clamped = Math.min(96, Math.max(baseFloor, rawScore));
      const move = base * (0.008 + (h % 9) / 500);
      const entryLo = bias === 'bearish' ? base + move * 0.2 : base - move * 0.2;
      const entryHi = bias === 'bearish' ? base + move * 0.45 : base + move * 0.08;
      const stop = bias === 'bearish' ? entryHi + move * 0.55 : entryLo - move * 0.55;
      const target = bias === 'bearish' ? base - move * 1.4 : base + move * 1.5;
      const state: ActionState = clamped > 86 ? 'Ready' : clamped > 76 ? 'Waiting' : clamped > 68 ? 'Early' : 'Avoid';

      return {
        signal: {
          symbol,
          timeframe,
          setup: setupPool[(h + index) % setupPool.length],
          bias,
          score: clamped,
          state,
          entry: `${formatPrice(Math.min(entryLo, entryHi))} - ${formatPrice(Math.max(entryLo, entryHi))}`,
          stop: formatPrice(stop),
          target: formatPrice(target),
          reason: [notePool[h % notePool.length], notePool[(h + 2) % notePool.length]],
          source: level,
        } satisfies SignalItem,
        rr: 1.5,
        expectancy: 0,
      };
    }

    const bias: Bias = h % 2 === 0 ? "bullish" : "bearish";
    const setup = ["Breakout Retest", "Trend Continuation", "Liquidity Sweep", "Range Reversal"][h % 4] ?? "Trend Continuation";
    const atr = base * (0.003 + ((h >> 1) % 8) / 2000);
    const stopDistance = Math.max(base * 0.0018, atr * 1.2);
    const entryMid = base * (1 + (((h >> 3) % 23) - 11) / 2200);
    const entryHalfBand = atr * 0.22;
    const entryLo = entryMid - entryHalfBand;
    const entryHi = entryMid + entryHalfBand;
    const rr = 2.2 + (((h >> 6) % 14) / 10);
    const stop = bias === "bullish" ? entryMid - stopDistance : entryMid + stopDistance;
    const target = bias === "bullish" ? entryMid + stopDistance * rr : entryMid - stopDistance * rr;

    const trend4h = 12 + (h % 9); // /20
    const structure1h = 10 + ((h >> 4) % 11); // /20
    const trigger15m = 9 + ((h >> 7) % 12); // /20
    const momentum = 4 + ((h >> 2) % 7); // /10
    const volumeRatio = 0.9 + ((h >> 5) % 14) / 10;
    const volumeScore = volumeRatio >= 1.8 ? 10 : volumeRatio >= 1.4 ? 8 : volumeRatio >= 1.1 ? 5 : 2;
    const rrQuality = rr >= 2.8 ? 10 : rr >= 2.2 ? 8 : rr >= 1.8 ? 5 : 0;
    const freshnessExecution = 4 + ((h >> 9) % 7); // /10
    const totalScore = trend4h + structure1h + trigger15m + momentum + volumeScore + rrQuality + freshnessExecution;

    let pwin = 0.30;
    if (trend4h >= 17) pwin += 0.10;
    if (structure1h >= 17) pwin += 0.06;
    if (trigger15m >= 16) pwin += 0.04;
    if (momentum >= 8) pwin += 0.04;
    if (volumeRatio >= 1.4) pwin += 0.03;
    if (freshnessExecution <= 5) pwin -= 0.04;
    if (Math.abs(entryMid - base) / Math.max(1e-9, base) > 0.01) pwin -= 0.05;
    pwin = Math.min(0.75, Math.max(0.20, pwin));
    const expectancy = pwin * rr - (1 - pwin) * 1.0 - 0.08;

    const hardReject =
      volumeRatio < 1.05 ||
      freshnessExecution < 5 ||
      rr < 2.2 ||
      expectancy <= 0.02 ||
      (trend4h < 14 && structure1h < 14);
    const setupScore = Math.max(0, Math.min(100, hardReject ? Math.min(totalScore, 74) : totalScore));
    const pwinScaled = pwin * 100;
    const rrScaled = Math.max(0, Math.min(100, ((rr - 1.8) / 2.0) * 100));
    const finalRank =
      0.35 * setupScore +
      0.20 * pwinScaled +
      0.20 * rrScaled +
      0.10 * volumeScore * 10 +
      0.10 * freshnessExecution * 10 +
      0.05 * freshnessExecution * 10;
    const clamped = Math.max(0, Math.min(99, Math.round(finalRank)));
    const state: ActionState = hardReject ? "Avoid" : setupScore >= 90 ? "Ready" : setupScore >= 85 ? "Waiting" : "Early";
    const autoReview = setupScore >= 90 || (setupScore >= 85 && rr >= 2.8 && expectancy >= 0.35);

    return {
      signal: {
        symbol,
        timeframe,
        setup,
        bias,
        score: clamped,
        state,
        entry: `${formatPrice(Math.min(entryLo, entryHi))} - ${formatPrice(Math.max(entryLo, entryHi))}`,
        stop: formatPrice(stop),
        target: formatPrice(target),
        reason: [
          `Score ${setupScore}/100 | E ${expectancy.toFixed(2)}R | Pwin ${(pwin * 100).toFixed(0)}% | RR ${rr.toFixed(1)}`,
          volumeRatio >= 1.4 ? "Volume supports expansion" : "Volume weak, caution",
          autoReview ? "Auto-trade review eligible" : "Signal only",
        ],
        source: level,
      } satisfies SignalItem,
      rr,
      expectancy,
      setupScore,
      hardReject,
      finalRank: clamped,
    };
  });

  if (isAce) {
    const strict = scored
      .filter((row) => !row.hardReject && (row.setupScore ?? 0) >= 85 && row.rr >= 2.2 && row.expectancy > 0)
      .sort((a, b) => (b.finalRank ?? 0) - (a.finalRank ?? 0));

    // Controlled fallback: keep Ace strict by default, but avoid under-filling when
    // strict candidates are temporarily sparse by selecting near-threshold setups.
    const fallback = scored
      .filter(
        (row) =>
          !row.hardReject &&
          (row.setupScore ?? 0) >= 82 &&
          row.rr >= 2.2 &&
          row.expectancy > 0.04,
      )
      .sort((a, b) => (b.finalRank ?? 0) - (a.finalRank ?? 0));

    const merged = [...strict, ...fallback];
    const unique = new Map<string, (typeof merged)[number]>();
    for (const row of merged) {
      if (!unique.has(row.signal.symbol)) {
        unique.set(row.signal.symbol, row);
      }
      if (unique.size >= 12) break;
    }

    const result = [...unique.values()]
      .sort((a, b) => (b.finalRank ?? 0) - (a.finalRank ?? 0))
      .slice(0, 12)
      .map((row) => row.signal);
    signalUniverseCache.set(cacheKey, result);
    if (signalUniverseCache.size > 60) {
      const firstKey = signalUniverseCache.keys().next().value;
      if (firstKey) signalUniverseCache.delete(firstKey);
    }
    return result;
  }

  const qualificationScore =
    level === "easy"
      ? 80
      : level === "medium"
      ? 82
      : level === "advanced"
      ? 86
      : 84;

  const result = scored
    .filter((row) => row.signal.bias !== "neutral" && row.signal.score >= qualificationScore && row.signal.state !== "Avoid")
    .sort((a, b) => b.signal.score - a.signal.score)
    .slice(0, visibleSignalCap)
    .map((row) => row.signal);
  signalUniverseCache.set(cacheKey, result);
  if (signalUniverseCache.size > 60) {
    const firstKey = signalUniverseCache.keys().next().value;
    if (firstKey) signalUniverseCache.delete(firstKey);
  }
  return result;
}

export function buildSignals(level: Difficulty | 'scanner', timeframe: string, cycleSeed = 0) {
  const symbolUniverse = level === "ace" ? aceScannerSymbols : scannerSymbols;
  return buildSignalsForUniverse(level, timeframe, symbolUniverse, cycleSeed);
}

export function buildHistory(level: Difficulty, timeframe: string, cycleSeedOverride?: number) {
  const now = new Date();
  const nowMs = now.getTime();
  const baseTimeframeMinutes = timeframeToMinutes(timeframe);
  const currentBarOpenMs = getLocalAlignedBarOpenMs(now, baseTimeframeMinutes);
  const cycleSeed = cycleSeedOverride ?? Math.floor(nowMs / (5 * 60_000));
  const signals = buildSignals(level, timeframe, cycleSeed);
  if (signals.length === 0) return [];
  const historySize = level === "easy" ? 72 : level === "medium" ? 96 : level === "advanced" ? 120 : level === "expert" ? 144 : 168;

  return Array.from({ length: historySize }, (_, index) => {
    const signal = signals[index % signals.length];
    const cycleRound = Math.floor(index / signals.length);
    const h = hash(`${signal.symbol}:${level}:${index}:${cycleSeed}:${cycleRound}`);
    const timeframeMinutes = timeframeToMinutes(signal.timeframe);
    const timeframeMs = timeframeMinutes * 60_000;
    const barsBack = 1 + cycleRound;
    const entryBarOpenMs = currentBarOpenMs - barsBack * timeframeMs;
    const entryOffsetMinutes = h % Math.max(1, timeframeMinutes);
    const entryOffsetSeconds = (h >> 5) % 60;
    const entryMs = entryBarOpenMs + entryOffsetMinutes * 60_000 + entryOffsetSeconds * 1_000;
    const entryDate = new Date(entryMs);
    const holdBars = Math.max(1, 1 + (h % 3));
    const exitOffsetMinutes = (h >> 7) % Math.max(1, timeframeMinutes);
    const exitOffsetSeconds = (h >> 11) % 60;
    const plannedExitMs = entryMs + holdBars * timeframeMs + exitOffsetMinutes * 60_000 + exitOffsetSeconds * 1_000;
    const resolvedStatuses: TradeOutcome[] =
      level === "ace"
        ? ['Loss', 'Loss', 'Win', 'Win', 'Partial', 'Closed']
        : ['Win', 'Loss', 'Closed', 'Partial'];
    const shouldResolve = cycleRound > 0 || plannedExitMs <= currentBarOpenMs - Math.floor(timeframeMs * 0.25);
    const tradeStatus: TradeOutcome = shouldResolve
      ? resolvedStatuses[(h + cycleSeed + index) % resolvedStatuses.length]
      : 'Open';
    const exitDate = new Date(plannedExitMs);

    return {
      symbol: signal.symbol,
      timeframe: signal.timeframe,
      strategy: signal.setup,
      entry: signal.entry,
      stop: signal.stop,
      target: signal.target,
      entryTime: formatHistoryTimestampLocal(entryDate),
      exitTime: tradeStatus === 'Open' ? '--' : formatHistoryTimestampLocal(exitDate),
      status: tradeStatus,
      rr: `${(level === "ace" ? (2.2 + (h % 14) / 10) : (1.1 + (h % 18) / 10)).toFixed(1)}R`,
      note: notePool[(h + 1) % notePool.length],
    } satisfies HistoryTrade;
  }).sort((a, b) => b.entryTime.localeCompare(a.entryTime));
}
export function buildAnalysis(symbol: string, timeframe: string, input: AnalysisInput = {}): AnalysisModel {
  const h = hash(`${symbol}:${timeframe}`);
  const basePrice = priceSeed(symbol) * timeframeFactor(timeframe);
  const livePrice = typeof input.livePrice === "number" && Number.isFinite(input.livePrice) && input.livePrice > 0 ? input.livePrice : null;
  const closes = (input.recentCloses ?? []).filter((value) => Number.isFinite(value) && value > 0);
  const currentPrice = livePrice ?? closes[closes.length - 1] ?? basePrice * (1 + ((h % 11) - 5) / 900);
  const window = closes.slice(-24);
  const derivedHigh = window.length > 0 ? Math.max(...window) : currentPrice * (1.05 + (h % 7) / 100);
  const derivedLow = window.length > 0 ? Math.min(...window) : currentPrice * (0.94 - (h % 5) / 100);
  const swingHigh = Math.max(currentPrice * 1.004, derivedHigh);
  const swingLow = Math.min(currentPrice * 0.996, derivedLow);
  const equilibrium = ((swingHigh + swingLow) / 2) * (1 + ((h % 9) - 4) / 240);
  const supportA = Math.min(currentPrice * 0.996, currentPrice - (currentPrice - swingLow) * 0.3);
  const supportB = Math.min(currentPrice * 0.985, currentPrice - (currentPrice - swingLow) * 0.72);
  const resistanceA = Math.max(currentPrice * 1.004, currentPrice + (swingHigh - currentPrice) * 0.32);
  const resistanceB = Math.max(currentPrice * 1.016, currentPrice + (swingHigh - currentPrice) * 0.68);
  const priceDelta = (currentPrice - equilibrium) / Math.max(1, equilibrium);
  const trendFromCloses =
    window.length > 1
      ? (window[window.length - 1] - window[Math.max(0, window.length - 8)]) / Math.max(1, window[Math.max(0, window.length - 8)])
      : 0;
  const shortReturns =
    window.length > 2
      ? window.slice(1).map((value, index) => (value - window[index]) / Math.max(1, window[index]))
      : [];
  const volatility =
    shortReturns.length > 0
      ? Math.sqrt(shortReturns.reduce((acc, value) => acc + value * value, 0) / shortReturns.length)
      : 0.0018;
  const weightedSlope =
    window.length > 3
      ? (window[window.length - 1] - window[Math.max(0, window.length - 12)]) / Math.max(1, window[Math.max(0, window.length - 12)])
      : trendFromCloses;
  const momentumDrift = trendFromCloses !== 0 ? trendFromCloses * 0.75 : ((h % 17) - 8) / 1000;
  const directionalSignal = priceDelta + momentumDrift;
  const bias: Bias = Math.abs(directionalSignal) < 0.0018 ? "neutral" : directionalSignal > 0 ? "bullish" : "bearish";
  const bullish = bias === "bullish";
  const confidenceBase = Math.round(65 + Math.min(26, Math.abs(directionalSignal) * 1600));
  const confidence = Math.max(60, Math.min(96, confidenceBase));
  const setupScore = 62 + (h % 31);
  const setupQuality: AnalysisModel["setupQuality"] = setupScore >= 82 ? "Excellent" : setupScore >= 70 ? "Good" : "Fair";
  const demand: [number, number] = [supportB * 0.998, supportA];
  const supply: [number, number] = [resistanceA, resistanceB * 1.004];
  const projectionSlope =
    bias === "neutral"
      ? weightedSlope * 0.15
      : weightedSlope !== 0
      ? weightedSlope * 0.32
      : bullish
      ? 0.0016
      : -0.0016;
  const projection = Array.from({ length: 8 }, (_, index) => {
    const step = index + 1;
    const trendComponent = (projectionSlope + trendFromCloses * 0.2) * step;
    const waveAmplitude = Math.max(0.00045, Math.min(0.0048, volatility * 0.7));
    const waveComponent = Math.sin((h % 7) + step / 1.6) * waveAmplitude;
    const damping = 1 - step * 0.03;
    return currentPrice * (1 + trendComponent * damping + waveComponent);
  });
  const projectionAlt = projection.map((value, index) => {
    const drift = (index + 1) * (bullish ? -0.0019 : 0.0019);
    const swing = Math.sin(index / 1.3) * Math.max(0.0005, volatility * 0.45);
    return currentPrice * (1 + drift + swing);
  });
  const ema20 = window.length > 0 ? window.slice(-8).reduce((acc, value) => acc + value, 0) / window.slice(-8).length : currentPrice * 0.998;
  const ema50 = window.length > 0 ? window.slice(-16).reduce((acc, value) => acc + value, 0) / window.slice(-16).length : currentPrice * 0.996;
  const ema200 = window.length > 0 ? window.reduce((acc, value) => acc + value, 0) / window.length : currentPrice * 0.992;
  const fvg: [number, number] = bullish ? [resistanceA * 0.996, resistanceB * 0.991] : [supportA * 1.004, resistanceA * 0.998];
  const change24h =
    closes.length > 1
      ? ((currentPrice - closes[Math.max(0, closes.length - 24)]) / Math.max(1, closes[Math.max(0, closes.length - 24)])) * 100
      : directionalSignal * 100;
  const immediateBand = Math.max(Math.abs(resistanceA - supportA) * 0.35, currentPrice * 0.0012);
  const planEntry: [number, number] = bullish
    ? [currentPrice - immediateBand * 0.65, currentPrice + immediateBand * 0.15]
    : [currentPrice - immediateBand * 0.15, currentPrice + immediateBand * 0.65];
  const planTrigger: [number, number] = bullish
    ? [currentPrice * 1.0012, currentPrice * 1.0027]
    : [currentPrice * 0.9973, currentPrice * 0.9988];
  const planStop = bullish ? swingLow * 0.998 : swingHigh * 1.002;
  const rawTarget1 = projection[Math.min(3, projection.length - 1)] ?? currentPrice;
  const rawTarget2 = projection[projection.length - 1] ?? currentPrice;
  const planTarget1 = bullish
    ? Math.max(rawTarget1, currentPrice * 1.002, resistanceA)
    : Math.min(rawTarget1, currentPrice * 0.998, supportA);
  const planTarget2 = bullish
    ? Math.max(rawTarget2, planTarget1 * 1.002, resistanceB)
    : Math.min(rawTarget2, planTarget1 * 0.998, demand[0]);
  const riskDistance = bullish
    ? Math.max(0.000001, currentPrice - planStop)
    : Math.max(0.000001, planStop - currentPrice);
  const rrPrimaryRaw = Math.abs((planTarget1 - currentPrice) / riskDistance);
  const rrExtendedRaw = Math.abs((planTarget2 - currentPrice) / riskDistance);
  const rrPrimary = `1:${Math.max(0.5, rrPrimaryRaw).toFixed(1)}`;
  const rrExtended = `1:${Math.max(0.6, rrExtendedRaw).toFixed(1)}`;

  return {
    symbol,
    timeframe,
    currentPrice,
    change24h,
    bias,
    confidence,
    setupScore,
    setupQuality,
    action: bias === "neutral"
      ? `Hold while price rotates around ${formatPrice(currentPrice)} and wait for trigger break ${formatPrice(planTrigger[0])}/${formatPrice(planTrigger[1])}`
      : bullish
      ? `Watch bullish trigger above ${formatPrice(planTrigger[0])} - ${formatPrice(planTrigger[1])} from current price`
      : `Watch bearish trigger below ${formatPrice(planTrigger[1])} - ${formatPrice(planTrigger[0])} from current price`,
    modeHint: bias === "neutral" ? "No entry yet" : "Waiting for 15m/1h price-trigger confirmation",
    summary: bullish
      ? `Price is trading above equilibrium and short-term momentum is constructive. The stronger long setup still comes from confirmation near demand or a clean push through nearby resistance.`
      : bias === "bearish"
      ? `Price is trading below equilibrium and momentum remains heavy, so rallies into resistance are vulnerable. The cleaner idea is rejection or a decisive breakdown, not chasing random candles.`
      : `Price is clustering around equilibrium without directional commitment. Treat this as a compression phase and wait for a decisive break before committing risk.`,
    summaryBullets: bullish
      ? [
          `Live price ${formatPrice(currentPrice)} is holding above short-term trigger base.`,
          `Watching trigger break ${formatPrice(planTrigger[0])}-${formatPrice(planTrigger[1])} on 15m/1h.`,
        ]
      : bias === "bearish"
      ? [
          `Live price ${formatPrice(currentPrice)} is failing beneath trigger zone.`,
          `Watching downside trigger ${formatPrice(planTrigger[1])}-${formatPrice(planTrigger[0])}.`,
        ]
      : [
          "Range compression around equilibrium.",
          "Waiting for breakout confirmation before entry.",
        ],
    technicals: [
      bullish
        ? 'MACD, Stochastic, and RSI are soft, but ADX still shows usable trend strength and Fisher is attempting to recover.'
        : 'Momentum, RSI, and Vortex lean bearish while ADX keeps trend strength elevated, which means a clean rejection could accelerate quickly.',
      'The setup has signal conflict, so confirmation matters more than raw indicator count.',
      timeframe === '15m'
        ? 'Lower timeframe noise is high, so pair this with 1h structure before acting.'
        : timeframe === '1h'
          ? 'Use the 4h chart as context and treat 15m only as entry timing.'
          : 'The selected timeframe is strong enough to define the setup, but lower timeframe confirmation still improves execution.',
    ],
    criticalLevels: [
      `${formatPrice(swingHigh)} — Most recent swing high / liquidity above`,
      `${formatPrice(resistanceA)} — Near-term resistance`,
      `${formatPrice(resistanceB)} — Stronger overhead barrier`,
      `${formatPrice(swingLow)} — Latest swing low / sweep zone`,
      `${formatPrice(demand[0])} - ${formatPrice(demand[1])} — Demand / support pocket`,
      `${formatPrice(equilibrium)} — Equilibrium / mean reversion line`,
    ],
    tradeIdeas: bullish
      ? [
          `Watch for bullish reclaim and close through trigger ${formatPrice(planTrigger[0])} - ${formatPrice(planTrigger[1])}.`,
          `Safer entry comes from a retest-hold of ${formatPrice(planEntry[1])} after trigger break.`,
          `If price loses ${formatPrice(planStop)} structure, cancel long idea and wait for reset.`,
        ]
      : [
          `Look for rejection/failure around ${formatPrice(planEntry[0])} - ${formatPrice(planEntry[1])}.`,
          `A decisive close below trigger ${formatPrice(planTrigger[1])} opens continuation momentum.`,
          `If price reclaims above ${formatPrice(planStop)} with volume, bearish setup is invalidated.`,
        ],
    expectation: bullish
      ? [
          `If lower-timeframe bullish confirmation appears inside demand, expect a move first toward ${formatPrice(resistanceA)}, then ${formatPrice(resistanceB)}.` ,
          `Bias flips stronger only after price closes above ${formatPrice(resistanceA)} with volume and holds the breakout.` ,
          `If price sweeps below ${formatPrice(swingLow)} and quickly reclaims, treat it as a classic liquidity-grab long setup.` ,
        ]
      : bias === "bearish"
      ? [
          `If rallies fail below ${formatPrice(resistanceA)}, expect a rotation back toward ${formatPrice(supportA)} and then ${formatPrice(demand[0])}.`,
          `Bias gets cleaner on a strong close below ${formatPrice(supportA)} because that confirms range breakdown.` ,
          `If price breaks and holds above ${formatPrice(resistanceA)}, switch from short idea to bullish continuation watchlist.` ,
        ]
      : [
          `If price breaks above ${formatPrice(resistanceA)} with acceptance, transition from neutral to bullish continuation.`,
          `If price closes below ${formatPrice(supportA)}, expect a downside rotation toward ${formatPrice(demand[0])}.`,
          `Until a break confirms, assume range behavior and avoid forcing directional entries.`,
        ],
    entryConditions: bullish
      ? [
          `Watch long when price reclaims ${formatPrice(planEntry[0])} - ${formatPrice(planEntry[1])}.`,
          'Require one of: bullish engulfing, pin bar, RSI divergence, or fast reclaim after a sweep.',
          `Safer long only after a close above trigger ${formatPrice(planTrigger[0])}.` ,
        ]
      : [
          `Watch short when price loses ${formatPrice(planEntry[0])} - ${formatPrice(planEntry[1])} or fails retest.` ,
          'Require one of: bearish engulfing, lower-high rejection, momentum rollover, or failed reclaim.',
          `Stronger short confirmation comes after a close below trigger ${formatPrice(planTrigger[1])}.` ,
        ],
    invalidation: bullish
      ? [
          `No long if price closes below ${formatPrice(demand[0])} and cannot reclaim quickly.`,
          `Reduce confidence if volume stays weak into resistance near ${formatPrice(resistanceA)}.` ,
        ]
      : [
          `No short if price closes above ${formatPrice(resistanceA)} with strong participation.`,
          `Avoid forcing downside if the sweep above ${formatPrice(resistanceB)} reclaims back inside range.` ,
        ],
    scenarios: [
      {
        label: 'Bullish Path',
        probability: bullish ? 68 : 36,
        description: `Price holds the long entry pocket, reclaims trigger resistance, and extends toward the upside ladder.`,
        trigger: `Bullish reclaim above ${formatPrice(planTrigger[0])}`,
        bullets: [`Hold above ${formatPrice(planEntry[1])}`, `Break trigger ${formatPrice(planTrigger[0])}`, `Target ${formatPrice(Math.max(planTarget2, currentPrice))}`],
      },
      {
        label: 'Bearish Path',
        probability: bullish ? 32 : 64,
        description: `Price fails near entry or loses support, then rotates into the downside ladder.`,
        trigger: `Close below ${formatPrice(planTrigger[1])}`,
        bullets: [`Reject ${formatPrice(planEntry[0])}`, `Close below ${formatPrice(planTrigger[1])}`, `Target ${formatPrice(Math.min(planTarget2, currentPrice))}`],
      },
    ],
    plan: {
      entry: planEntry,
      trigger: planTrigger,
      stop: planStop,
      target1: planTarget1,
      target2: planTarget2,
      rrPrimary,
      rrExtended,
    },
    levels: {
      resistance: [resistanceA, resistanceB, swingHigh],
      support: [supportA, demand[1], swingLow],
      swingHigh,
      swingLow,
      equilibrium,
      projection,
      projectionAlt,
      fvg,
      ema20,
      ema50,
      ema200,
      demand,
      supply,
    },
  };
}

export function buildDashboard(timeframe: string) {
  const scanner = buildSignals('scanner', timeframe);
  return {
    topSignals: scanner.slice(0, 10),
    predictions: scanner.slice(0, 10).map((item) => ({
      symbol: item.symbol,
      bias: item.bias,
      probability: item.score,
      headline: `${item.setup} on ${item.timeframe} with ${item.score}% confidence`,
    })),
    difficultyCards: trackerOrder.map((key) => {
      const meta = difficultyMeta.find((item) => item.key === key)!;
      const signals = buildSignals(key, timeframe);
      const history = buildHistory(key, timeframe);
      const wins = history.filter((trade) => trade.status === 'Win').length;
      const losses = history.filter((trade) => trade.status === 'Loss').length;
      return {
        ...meta,
        strongest: signals[0],
        winRate: `${Math.round((wins / Math.max(1, wins + losses)) * 100)}%`,
        totalTrades: history.length,
      };
    }),
  };
}
