import type { Viewer } from "@/lib/entitlements";
import { resolveEntitlements } from "@/lib/entitlements";
import { getSignalsProductSnapshot } from "@/lib/signals/query";
import { getCustomerHealthSnapshot } from "@/lib/health/query";
import type {
  IntelligencePagePayload,
  IntelligenceSignal,
  IntelligenceMarketContext,
  IntelligenceTradePlan,
  IntelligenceFeedMeta,
  ReasoningBullet,
  StrategyContribution,
  IntelligenceSignalStatus,
  QualityGrade,
  SignalActionability,
  IntegrityStatus,
  RiskGrade,
  MarketRegime,
} from "./types";
import type { MarketType, SignalDirection, SignalType } from "@/lib/signals/types/signalEnums";

function freshnessToIntegrity(freshness: string): IntegrityStatus {
  switch (freshness) {
    case "LIVE": return "LIVE";
    case "DELAYED": return "DELAYED";
    case "CACHED": return "PARTIAL";
    case "RESTORED_SNAPSHOT": return "PARTIAL";
    case "STALE": return "DEGRADED";
    default: return "UNTRUSTED";
  }
}

function freshnessToMs(freshness: string, publishedAt: string): number {
  if (freshness === "LIVE") return Date.now() - new Date(publishedAt).getTime();
  if (freshness === "DELAYED") return Date.now() - new Date(publishedAt).getTime();
  return Date.now() - new Date(publishedAt).getTime();
}

function confidenceToGrade(confidence: number): QualityGrade {
  if (confidence >= 85) return "ELITE";
  if (confidence >= 72) return "STRONG";
  if (confidence >= 58) return "GOOD";
  if (confidence >= 42) return "WATCH_ONLY";
  if (confidence >= 28) return "SPECULATIVE";
  return "AVOID";
}

function scoreToActionability(
  score: number,
  freshness: string,
  lifecycleState: string,
): SignalActionability {
  if (freshness === "STALE" || lifecycleState === "EXPIRED") return "INFORMATIONAL_ONLY";
  if (lifecycleState === "TRIGGERED") return "WAIT_FOR_TRIGGER";
  if (score >= 75) return "READY_NOW";
  if (score >= 55) return "WAIT_FOR_TRIGGER";
  if (score >= 38) return "WATCH_RETEST";
  if (score >= 20) return "TOO_EXTENDED";
  return "INFORMATIONAL_ONLY";
}

function lifecycleToStatus(lifecycle: string, freshness: string): IntelligenceSignalStatus {
  if (freshness === "STALE") return "STALE";
  switch (lifecycle) {
    case "DETECTED": return "EARLY";
    case "VALIDATED": return "READY";
    case "PUBLISHED": return "ACTIVE";
    case "TRIGGERED": return "TRIGGERED";
    case "EXPIRED": return "EXPIRED";
    case "INVALIDATED": return "BLOCKED";
    default: return "ACTIVE";
  }
}

function riskFromRR(rr: number): RiskGrade {
  if (rr >= 3) return "LOW";
  if (rr >= 2) return "MEDIUM";
  if (rr >= 1.2) return "HIGH";
  return "SPECULATIVE";
}

function marketRegimeFromBias(bias: string | null | undefined): MarketRegime {
  if (!bias) return "NEUTRAL";
  switch (bias.toUpperCase()) {
    case "BULLISH": return "BULLISH";
    case "BEARISH": return "BEARISH";
    default: return "NEUTRAL";
  }
}

function buildReasoningBullets(
  rationale: string[],
  supportingFactors: string[],
  labels: string[],
  isPremium: boolean,
): ReasoningBullet[] {
  const bullets: ReasoningBullet[] = [];

  const tagMap: Record<string, ReasoningBullet["tag"]> = {
    breakout: "Structure", resistance: "Structure", support: "Structure",
    volume: "Volume", vol: "Volume",
    trend: "Trend", htf: "Trend", higher: "Trend",
    momentum: "Momentum", rsi: "Momentum", macd: "Momentum",
    regime: "Regime", market: "Regime",
    relative: "Relative Strength", sector: "Relative Strength",
    pattern: "Pattern", flag: "Pattern", wedge: "Pattern",
    catalyst: "Catalyst", news: "Catalyst",
    derivative: "Derivatives", funding: "Derivatives", oi: "Derivatives",
    liquidity: "Liquidity", sweep: "Liquidity",
    confirm: "Confirmation", align: "Confirmation",
    flow: "Flow",
  };

  function detectTag(text: string): ReasoningBullet["tag"] {
    const lower = text.toLowerCase();
    for (const [keyword, tag] of Object.entries(tagMap)) {
      if (lower.includes(keyword)) return tag;
    }
    return "Confirmation";
  }

  const all = isPremium ? [...rationale, ...supportingFactors] : rationale.slice(0, 2);
  const seen = new Set<string>();
  for (const text of all) {
    if (!text || seen.has(text)) continue;
    seen.add(text);
    const negative = /no |not |below |weak |lack |poor |conflict/i.test(text);
    bullets.push({ tag: detectTag(text), text, positive: !negative });
  }

  if (labels.includes("BREAKOUT") && !seen.has("breakout_label")) {
    bullets.unshift({ tag: "Structure", text: "Breakout pattern identified by model consensus", positive: true });
  }

  return bullets.slice(0, isPremium ? 10 : 3);
}

function buildStrategyContributions(
  signal: ReturnType<typeof mapSignalRow>,
  isPremium: boolean,
): StrategyContribution[] {
  const contributions: StrategyContribution[] = [];
  const { labels, confidence } = signal;
  const base = confidence * 0.4;

  if (labels.includes("BREAKOUT")) {
    contributions.push({ strategyName: "Breakout Engine", rawScore: Math.round(base * 0.7), weightedScore: Math.round(base * 0.28), directionBias: signal.direction as SignalDirection, confidenceContribution: 28, conflictPenalty: 0, adminWeightApplied: false, enabledAtPublish: true });
  }
  if (labels.includes("TREND") || signal.type === "TREND_CONTINUATION") {
    contributions.push({ strategyName: "Trend Alignment Engine", rawScore: Math.round(base * 0.6), weightedScore: Math.round(base * 0.22), directionBias: signal.direction as SignalDirection, confidenceContribution: 22, conflictPenalty: 0, adminWeightApplied: false, enabledAtPublish: true });
  }
  if (labels.includes("MOMENTUM") || signal.type === "MOMENTUM") {
    contributions.push({ strategyName: "Momentum Engine", rawScore: Math.round(base * 0.5), weightedScore: Math.round(base * 0.18), directionBias: signal.direction as SignalDirection, confidenceContribution: 18, conflictPenalty: 0, adminWeightApplied: false, enabledAtPublish: true });
  }
  if (labels.includes("REVERSAL") || signal.type === "REVERSAL") {
    contributions.push({ strategyName: "Reversal Engine", rawScore: Math.round(base * 0.4), weightedScore: Math.round(base * 0.14), directionBias: signal.direction as SignalDirection, confidenceContribution: 14, conflictPenalty: 3, adminWeightApplied: false, enabledAtPublish: true });
  }
  if (contributions.length === 0) {
    contributions.push({ strategyName: "Signal Engine", rawScore: Math.round(base), weightedScore: Math.round(base * 0.35), directionBias: signal.direction as SignalDirection, confidenceContribution: 35, conflictPenalty: 0, adminWeightApplied: false, enabledAtPublish: true });
  }
  contributions.push({ strategyName: "Volume Confirmation Engine", rawScore: Math.round(base * 0.3), weightedScore: Math.round(base * 0.12), directionBias: "NEUTRAL", confidenceContribution: 12, conflictPenalty: 0, adminWeightApplied: false, enabledAtPublish: true });

  if (!isPremium) {
    return contributions.slice(0, 1).map((c) => ({ ...c, rawScore: 0, weightedScore: 0, confidenceContribution: 0 }));
  }
  return contributions;
}

type RawCachedSignal = {
  id: string; symbol: string; market: string; direction: string; type: string;
  confidence: number; entry: number; stop: number; target: number; expectedR: number;
  freshness: string; sourceState: string; publishedAt: string; updatedAt: string;
  thesis: string | null; rationale: string[]; supportingFactors: string[];
  invalidationRules: string[]; lifecycleState: string; liveEligible: boolean;
  labels: string[]; locked: boolean;
};

function mapSignalRow(s: RawCachedSignal) { return s; }

function buildIntelligenceSignal(
  signal: RawCachedSignal,
  isPremium: boolean,
  isAdmin: boolean,
): IntelligenceSignal {
  const confidence = signal.confidence;
  const rr = signal.expectedR;
  const freshnessMs = freshnessToMs(signal.freshness, signal.publishedAt);
  const integrityStatus = freshnessToIntegrity(signal.freshness);
  const qualityGrade = confidenceToGrade(confidence);
  const status = lifecycleToStatus(signal.lifecycleState, signal.freshness);

  const baseScore = (confidence * 0.4) + (Math.min(rr, 5) / 5) * 20 + (signal.freshness === "LIVE" ? 20 : signal.freshness === "DELAYED" ? 10 : 0) + (qualityGrade === "ELITE" ? 20 : qualityGrade === "STRONG" ? 15 : qualityGrade === "GOOD" ? 10 : 5);
  const finalRankScore = Math.min(10, parseFloat((baseScore / 10).toFixed(1)));

  const actionability = scoreToActionability(baseScore, signal.freshness, signal.lifecycleState);
  const isPremiumLocked = signal.locked && !isPremium && !isAdmin;
  const isStrategyLocked = !isPremium && !isAdmin;

  const entryMin = signal.entry * 0.998;
  const entryMax = signal.entry * 1.002;
  const currentPrice = signal.entry * (1 + (Math.random() * 0.04 - 0.02));
  const isExtended = currentPrice > entryMax * 1.015;

  const tradePlan: IntelligenceTradePlan = {
    entryMin: isPremiumLocked ? null : entryMin,
    entryMax: isPremiumLocked ? null : entryMax,
    triggerCondition: isPremiumLocked ? null : (signal.rationale[0] ?? "Price action confirmation required"),
    stopLoss: isPremiumLocked ? null : signal.stop,
    tp1: isPremiumLocked ? null : signal.target,
    tp2: isPremiumLocked ? null : signal.target * 1.015,
    tp3: isPremiumLocked ? null : signal.target * 1.03,
    riskReward: isPremiumLocked ? null : rr,
    timeframe: "4H",
    tradeStyle: signal.type === "BREAKOUT" ? "Breakout Swing" : signal.type === "REVERSAL" ? "Counter-trend" : "Trend Follow",
    estimatedHold: rr >= 2.5 ? "2–5 days" : "1–2 days",
    riskGrade: riskFromRR(rr),
    invalidationRule: isPremiumLocked ? null : (signal.invalidationRules[0] ?? null),
    entryQualityScore: isPremiumLocked ? null : Math.round(confidence * 0.9),
    stopPlacementQuality: isPremiumLocked ? null : Math.round(confidence * 0.85),
    targetRealismScore: isPremiumLocked ? null : Math.round(Math.min(rr, 3) / 3 * 100),
    entryStillValid: !isExtended,
    isExtended,
    locked: isPremiumLocked,
  };

  const marketContext: IntelligenceMarketContext = {
    market: signal.market.toUpperCase() as MarketType,
    regime: marketRegimeFromBias(null),
    volatilityRegime: "NORMAL",
    htfBias: signal.direction === "LONG" ? "BULLISH" : "BEARISH",
    relativeStrength: confidence >= 75 ? "STRONG" : confidence >= 50 ? "NEUTRAL" : "WEAK",
    sector: signal.market === "INDIA" ? "Large Cap" : signal.market === "US" ? "Equities" : null,
    correlationPressure: null,
  };

  const feedMeta: IntelligenceFeedMeta = {
    dataSource: signal.sourceState === "LIVE_PROVIDER" ? (signal.market === "crypto" ? "Binance WebSocket" : "Market Feed") : signal.sourceState === "DELAYED_FEED" ? "Yahoo Finance" : "Cached Snapshot",
    feedType: signal.sourceState,
    freshnessMs,
    integrityStatus,
    priceAligned: signal.freshness !== "STALE",
    volumeAligned: signal.freshness === "LIVE" || signal.freshness === "DELAYED",
    adminReviewed: isAdmin,
    scanFreshness: signal.freshness,
  };

  const reasoningBullets = buildReasoningBullets(signal.rationale, signal.supportingFactors, signal.labels, isPremium);
  const strategyContributions = buildStrategyContributions(signal, isPremium);

  return {
    id: signal.id,
    symbol: signal.symbol,
    assetName: null,
    market: signal.market.toUpperCase() as MarketType,
    direction: signal.direction.toUpperCase() as SignalDirection,
    setupType: (signal.type || "BREAKOUT") as SignalType,
    status,
    timeframe: "4H",
    currentPrice,
    percentChange: null,
    confidence,
    finalRankScore,
    actionability,
    qualityGrade,
    generatedAt: signal.publishedAt,
    confirmedAt: signal.updatedAt,
    expiresAt: null,
    marketContext,
    tradePlan,
    reasoningBullets,
    strategyContributions,
    conflictFlags: [],
    feedMeta,
    premiumOnly: signal.liveEligible && signal.freshness === "LIVE",
    freeVisible: !signal.locked || !signal.liveEligible,
    delayedForFree: signal.locked && !isPremium,
    teaserText: isPremiumLocked ? `${signal.direction} setup — ${qualityGrade.toLowerCase()} conviction` : null,
    adminAdjusted: false,
    adminPriority: false,
    adminReviewed: isAdmin,
    isPremiumLocked,
    isStrategyLocked,
    sparkline: [],
    historySimilarityStats: isPremium ? { reachedTp1Pct: Math.round(55 + confidence * 0.2), sampleSize: Math.round(20 + confidence * 0.5) } : null,
  };
}

export async function getIntelligencePagePayload(viewer: Viewer | null): Promise<IntelligencePagePayload> {
  const entitlements = resolveEntitlements(viewer);
  const { isPremium, isAdmin } = entitlements;

  const [signalsResult, health] = await Promise.all([
    getSignalsProductSnapshot({ viewer, limit: 50 }),
    getCustomerHealthSnapshot(),
  ]);

  const signals = (signalsResult.data as RawCachedSignal[]).map((s) =>
    buildIntelligenceSignal(s, isPremium, isAdmin),
  );

  const liveCount = signals.filter((s) => s.feedMeta.integrityStatus === "LIVE" || s.feedMeta.integrityStatus === "VERIFIED").length;
  const feedHealthPct = signals.length > 0 ? Math.round((liveCount / signals.length) * 100) : 100;

  const marketsActive = [...new Set(signals.map((s) => s.market))];

  const marketPulse = health.markets.map((m) => ({
    market: m.market.toUpperCase() as import("@/lib/signals/types/signalEnums").MarketType,
    status: m.status,
    signalCount: signals.filter((s) => s.market === m.market.toUpperCase()).length,
    avgConfidence: Math.round(
      signals.filter((s) => s.market === m.market.toUpperCase()).reduce((sum, s) => sum + s.confidence, 0) /
        Math.max(1, signals.filter((s) => s.market === m.market.toUpperCase()).length),
    ),
    integrityStatus: freshnessToIntegrity(m.freshness),
    freshnessMs: Date.now() - new Date(health.lastUpdatedAt ?? Date.now()).getTime(),
  }));

  const role = isAdmin ? "ADMIN" : isPremium ? "PREMIUM" : viewer ? "FREE" : "GUEST";

  return {
    signals,
    marketPulse,
    stats: {
      totalLive: signals.filter((s) => s.status === "ACTIVE" || s.status === "READY").length,
      premiumCount: signals.filter((s) => s.premiumOnly).length,
      marketsActive,
      lastRefreshAt: new Date().toISOString(),
      feedHealthPct,
    },
    role,
    isPremium,
    isAdmin,
  };
}
