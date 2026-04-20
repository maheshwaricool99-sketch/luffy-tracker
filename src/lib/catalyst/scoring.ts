/**
 * CATALYST SIGNALS — SCORING ENGINE
 *
 * ISOLATION GUARANTEE:
 *   Pure functions. No side effects. Zero imports from trading, execution,
 *   portfolio, or engine modules. Safe to unit test in complete isolation.
 *
 * Scoring model:
 *   final score = Σ(component_i × weight_i)  where weights sum to 1.0
 *   All components are scaled 0-100 before weighting.
 */

import type {
  AssetType,
  CatalystCandidate,
  CatalystSignal,
  MatchedKeyword,
  RiskLevel,
  RiskTag,
  ScoreBreakdown,
  SignalCategory,
} from "./types";
import { SIGNAL_CATEGORY_LABELS } from "./types";
import { SCORE_WEIGHTS } from "./config";
import { computeKeywordStrengthScore } from "./keywords";

// ── Individual component scorers ──────────────────────────────────────────────

/**
 * Pre-pump accumulation score — the PRIMARY leading indicator.
 *
 * Scores HIGHEST when:
 *   - Volume is significantly above normal (crowd/institution actively accumulating)
 *   - Price has NOT spiked yet (the move hasn't happened — you're early)
 *
 * Logic:
 *   volumeScore  = how anomalous is the volume? (0-100)
 *   notMovedYet  = penalty factor that drops to 0 as changePct approaches 30%
 *   result       = volumeScore × notMovedYet
 *
 * A coin with 5× volume and +1% price scores ~74.
 * A coin with 5× volume and +42% price scores 0 (already pumped).
 */
export function computePrePumpVolumeScore(relativeVolume: number, changePct: number): number {
  const absChange = Math.abs(changePct);

  let volScore: number;
  if (relativeVolume >= 15) volScore = 100;
  else if (relativeVolume >= 10) volScore = 90;
  else if (relativeVolume >= 7)  volScore = 80;
  else if (relativeVolume >= 5)  volScore = 70;
  else if (relativeVolume >= 3)  volScore = 55;
  else if (relativeVolume >= 2)  volScore = 36;
  else if (relativeVolume >= 1.5) volScore = 18;
  else volScore = 0;

  // Drops linearly from 1.0 at 0% change to 0.0 at 30% change.
  // Already-pumped assets (>30%) score 0 regardless of volume.
  const notMovedYet = Math.max(0, 1 - absChange / 30);

  return Math.round(volScore * notMovedYet);
}

/**
 * Score based on daily price move.
 * NOTE: Weight is intentionally 0.00 in SCORE_WEIGHTS — kept for display
 * in the breakdown so users can see how much the asset has moved.
 * Stocks and crypto have different natural volatility thresholds.
 */
export function computePriceSpikeScore(changePct: number, assetType: AssetType): number {
  const abs = Math.abs(changePct);
  if (assetType === "stock") {
    if (abs >= 50) return 100;
    if (abs >= 30) return 92;
    if (abs >= 20) return 82;
    if (abs >= 15) return 72;
    if (abs >= 10) return 60;
    if (abs >= 7)  return 50;
    if (abs >= 5)  return 38;
    if (abs >= 3)  return 22;
    return Math.max(0, Math.round(abs * 5));
  } else {
    // Crypto: higher absolute moves are expected
    if (abs >= 80) return 100;
    if (abs >= 50) return 90;
    if (abs >= 30) return 78;
    if (abs >= 20) return 65;
    if (abs >= 15) return 55;
    if (abs >= 10) return 45;
    if (abs >= 7)  return 35;
    if (abs >= 5)  return 26;
    return Math.max(0, Math.round(abs * 4));
  }
}

/**
 * Score based on relative volume (1.0 = average; 5.0 = 5× average).
 * Volume anomalies are among the strongest leading indicators.
 */
export function computeRelativeVolumeScore(relVol: number): number {
  if (relVol >= 20) return 100;
  if (relVol >= 10) return 90;
  if (relVol >= 7)  return 80;
  if (relVol >= 5)  return 70;
  if (relVol >= 3)  return 58;
  if (relVol >= 2)  return 44;
  if (relVol >= 1.5) return 30;
  return Math.max(0, Math.round((relVol - 1) * 30));
}

/**
 * Score based on social mention spike percentage above baseline.
 * 0 = no social data; 100% = double baseline; 500%+ = extreme.
 */
export function computeMentionsSpikeScore(spikePct: number): number {
  if (spikePct <= 0)    return 0;
  if (spikePct >= 1000) return 100;
  if (spikePct >= 500)  return 88;
  if (spikePct >= 300)  return 75;
  if (spikePct >= 200)  return 65;
  if (spikePct >= 100)  return 55;
  if (spikePct >= 50)   return 40;
  return Math.max(0, Math.round(spikePct * 0.4));
}

/**
 * Pass-through for normalized sentiment (already 0-100).
 */
export function computeSentimentScore(normalizedSentiment: number): number {
  return Math.max(0, Math.min(100, Math.round(normalizedSentiment)));
}

/**
 * Freshness decay: signals become less relevant as they age.
 * Signal at < 1h = 100; > 24h = 5.
 */
export function computeFreshnessScore(detectedAtMs: number, nowMs = Date.now()): number {
  const ageMs = nowMs - detectedAtMs;
  const H = 60 * 60_000; // 1 hour in ms
  if (ageMs <= H)      return 100;
  if (ageMs <= 4 * H)  return 80;
  if (ageMs <= 8 * H)  return 60;
  if (ageMs <= 12 * H) return 40;
  if (ageMs <= 24 * H) return 20;
  return 5;
}

/**
 * Float and volatility risk score.
 * Low-float stocks and extremely volatile assets score higher here —
 * they are more interesting from a squeeze/momentum perspective.
 */
export function computeFloatVolatilityScore(
  float: number | undefined,
  changePct: number,
): number {
  let score = 0;
  if (float !== undefined) {
    if (float < 5_000_000)  score += 42;
    else if (float < 20_000_000) score += 28;
    else if (float < 50_000_000) score += 16;
  }
  const abs = Math.abs(changePct);
  if (abs >= 30) score += 30;
  else if (abs >= 20) score += 20;
  else if (abs >= 10) score += 10;
  return Math.min(100, score);
}

// ── Aggregate final score ─────────────────────────────────────────────────────

export function computeFinalScore(breakdown: ScoreBreakdown): number {
  const prePump = breakdown.prePumpVolumeScore ?? breakdown.relativeVolumeScore ?? 0;
  const raw =
    prePump                                    * SCORE_WEIGHTS.prePumpVolumeScore +
    (breakdown.priceSpikeScore ?? 0)            * SCORE_WEIGHTS.priceSpikeScore +
    (breakdown.relativeVolumeScore ?? 0)        * SCORE_WEIGHTS.relativeVolumeScore +
    (breakdown.mentionsSpikeScore ?? 0)         * SCORE_WEIGHTS.mentionsSpikeScore +
    (breakdown.keywordStrengthScore ?? 0)       * SCORE_WEIGHTS.keywordStrengthScore +
    (breakdown.sentimentScore ?? 0)             * SCORE_WEIGHTS.sentimentScore +
    (breakdown.sourceCredibilityScore ?? 0)     * SCORE_WEIGHTS.sourceCredibilityScore +
    (breakdown.floatOrVolatilityRiskScore ?? 0) * SCORE_WEIGHTS.floatOrVolatilityRiskScore +
    (breakdown.freshnessScore ?? 0)             * SCORE_WEIGHTS.freshnessScore;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

// ── Confidence ────────────────────────────────────────────────────────────────

/**
 * Confidence accounts for corroboration quality:
 *   - base = 60% of signalScore
 *   - +15 for any official headline
 *   - +10 for ≥3 keyword matches
 *   - +10 for strong social spike
 *   - +5 for both headline AND keyword density
 */
export function computeConfidence(
  signalScore: number,
  matchedKeywords: MatchedKeyword[],
  headlineCount: number,
  mentionSpikePct: number,
): number {
  let conf = signalScore * 0.6;
  if (headlineCount > 0) conf += 15;
  if (matchedKeywords.length >= 3) conf += 10;
  if (mentionSpikePct >= 100) conf += 10;
  if (headlineCount >= 2 && matchedKeywords.length >= 2) conf += 5;
  return Math.round(Math.min(100, conf));
}

// ── Category classification ───────────────────────────────────────────────────

/**
 * Classify the signal into the most likely category based on keyword themes
 * and market behavior. Priority order is intentional.
 */
export function classifyCategory(
  keywords: MatchedKeyword[],
  assetType: AssetType,
  relativeVolume: number,
  mentionSpikePct: number,
  changePct = 0,
): SignalCategory {
  const themes = new Set(keywords.map((k) => k.theme));
  const topWeight = keywords.length > 0 ? keywords[0].weight : 0;
  const absChange = Math.abs(changePct);

  // Pre-pump accumulation: volume spiking but price hasn't moved yet
  // This is the highest-priority classification when the signal is truly early.
  if (
    relativeVolume >= 3 &&
    absChange < 5 &&
    (keywords.length > 0 || mentionSpikePct >= 50) &&
    !themes.has("listing") &&
    !themes.has("squeeze")
  ) {
    return "pre-pump-buildup";
  }

  // Treasury signals are highly distinctive — check first
  if (themes.has("treasury") && (topWeight >= 80 || assetType === "stock")) return "treasury-reserve";

  // AI narrative pivot
  if (themes.has("ai-pivot") && topWeight >= 65) return "narrative-pivot";

  // Exchange listings (crypto)
  if (assetType === "crypto" && themes.has("listing")) return "listing-catalyst";

  // M&A / acquisition
  if (themes.has("acquisition")) return "partnership-deal";

  // Strategic partnerships
  if (themes.has("partnership") && topWeight >= 70) return "partnership-deal";

  // Uplisting (strong for small stocks)
  if (themes.has("uplisting")) return "listing-catalyst";

  // On-chain / ecosystem / DeFi (crypto)
  if (assetType === "crypto" && (themes.has("ecosystem") || themes.has("tokenomics") || themes.has("defi"))) {
    return "onchain-ecosystem";
  }

  // Squeeze conditions
  if (themes.has("squeeze") || (assetType === "stock" && relativeVolume >= 8)) return "possible-squeeze";

  // Product launch
  if (themes.has("product")) return "product-launch";

  // Meme / social surge
  if (themes.has("social-hype") || mentionSpikePct >= 300) return "meme-social-surge";

  // Regulatory / approval
  if (themes.has("regulatory")) return "news-breakout";

  // Buyback / return of capital
  if (themes.has("buyback")) return "news-breakout";

  // Generic partnership without high weight
  if (themes.has("partnership")) return "news-breakout";

  // Multiple keywords but no clear theme
  if (keywords.length >= 2) return "news-breakout";

  // Fallback: pure price/volume anomaly
  return "unusual-volume";
}

// ── Risk assessment ───────────────────────────────────────────────────────────

export function assessRisk(
  candidate: CatalystCandidate,
  signalScore: number,
): { riskLevel: RiskLevel; riskTags: RiskTag[] } {
  const tags = new Set<RiskTag>();
  const {
    assetType,
    changePct,
    relativeVolume,
    mentionSpikePct,
    float,
    matchedHeadlines,
    matchedKeywords,
  } = candidate;

  const absChange = Math.abs(changePct);
  const themes = new Set(matchedKeywords.map((k) => k.theme));
  const hasOfficialHeadline = matchedHeadlines.some((h) => h.credibilityScore >= 70);

  // Source credibility tags
  if (hasOfficialHeadline) {
    tags.add("official-news");
  } else if (matchedHeadlines.length === 0) {
    tags.add(mentionSpikePct > 0 ? "social-only" : "hype-only");
  } else {
    tags.add("unconfirmed");
  }

  // Low-float danger
  if (assetType === "stock" && float !== undefined && float < 10_000_000) {
    tags.add("low-float-danger");
    tags.add("squeeze-risk");
  }

  // Squeeze dynamics
  if (themes.has("squeeze")) tags.add("squeeze-risk");

  // Extreme volatility
  if (absChange >= 30 || (assetType === "crypto" && absChange >= 50)) {
    tags.add("extreme-volatility");
  }

  // Pump-and-dump risk
  if (themes.has("social-hype") && !hasOfficialHeadline && relativeVolume >= 5) {
    tags.add("likely-pump-dump");
  }

  // Unconfirmed narrative (partnership/acquisition rumor)
  if (!hasOfficialHeadline && (themes.has("partnership") || themes.has("acquisition"))) {
    tags.add("rumor-risk");
  }

  // Thin liquidity proxy (very small market cap + extreme move)
  if (assetType === "stock" && float !== undefined && float < 3_000_000 && absChange >= 50) {
    tags.add("thin-liquidity");
  }

  // Strong confirmed catalyst
  if (hasOfficialHeadline && matchedKeywords.length >= 2 && signalScore >= 65) {
    tags.add("strong-catalyst");
  }

  // Determine risk level
  let riskLevel: RiskLevel = "low";
  if (tags.has("likely-pump-dump") || tags.has("extreme-volatility")) {
    riskLevel = "extreme";
  } else if (tags.has("squeeze-risk") || tags.has("low-float-danger") || tags.has("rumor-risk") || tags.has("thin-liquidity")) {
    riskLevel = "high";
  } else if (tags.has("unconfirmed") || tags.has("social-only") || tags.has("hype-only")) {
    riskLevel = "medium";
  } else if (tags.has("strong-catalyst") && tags.has("official-news")) {
    riskLevel = "low";
  }

  return { riskLevel, riskTags: [...tags] };
}

// ── Human-readable summaries ──────────────────────────────────────────────────

export function buildReasonSummary(
  candidate: CatalystCandidate,
  breakdown: ScoreBreakdown,
): string {
  const parts: string[] = [];
  if (candidate.matchedKeywords.length > 0) {
    const topKw = candidate.matchedKeywords
      .slice(0, 2)
      .map((k) => `"${k.keyword}"`)
      .join(", ");
    parts.push(`Keyword hit: ${topKw}`);
  }
  if (breakdown.relativeVolumeScore >= 44) {
    parts.push(`${candidate.relativeVolume.toFixed(1)}× volume`);
  }
  if (candidate.mentionSpikePct >= 50) {
    parts.push(`+${Math.round(candidate.mentionSpikePct)}% social mentions`);
  }
  if (candidate.matchedHeadlines.length > 0) {
    const credTag = candidate.matchedHeadlines[0].credibilityScore >= 70 ? "credible" : "";
    parts.push(`${candidate.matchedHeadlines.length} ${credTag} headline(s)`.trim());
  }
  if (Math.abs(candidate.changePct) >= 5) {
    const sign = candidate.changePct >= 0 ? "+" : "";
    parts.push(`${sign}${candidate.changePct.toFixed(1)}% price`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Unusual activity detected";
}

export function buildWhyInteresting(candidate: CatalystCandidate, category: SignalCategory): string {
  const label = SIGNAL_CATEGORY_LABELS[category];
  const parts: string[] = [`Detected as: ${label}.`];
  if (candidate.matchedKeywords.length > 0) {
    const topTheme = candidate.matchedKeywords[0].theme.replace(/-/g, " ");
    parts.push(`Strong ${topTheme} narrative signal.`);
  }
  if (candidate.relativeVolume >= 3) {
    parts.push(`Volume is ${candidate.relativeVolume.toFixed(1)}× above normal — crowd or institutional interest.`);
  }
  if (candidate.mentionSpikePct >= 100) {
    parts.push(`Social mentions +${Math.round(candidate.mentionSpikePct)}% above baseline — crowd momentum.`);
  }
  if (candidate.matchedHeadlines.length > 0) {
    parts.push(`Corroborated by ${candidate.matchedHeadlines.length} headline(s).`);
  }
  return parts.join(" ");
}

export function buildWhyDangerous(
  riskTags: RiskTag[],
  changePct: number,
  relativeVolume: number,
): string {
  const parts: string[] = [];
  if (riskTags.includes("likely-pump-dump")) {
    parts.push("High pump-and-dump risk — social driven with no confirmed fundamental catalyst.");
  }
  if (riskTags.includes("low-float-danger")) {
    parts.push("Micro-float — extreme spread, reversal, and manipulation risk.");
  }
  if (riskTags.includes("thin-liquidity")) {
    parts.push("Thin liquidity — large orders move price significantly.");
  }
  if (riskTags.includes("extreme-volatility")) {
    parts.push(`Extreme intraday move (+${Math.abs(changePct).toFixed(1)}%) — reversal risk is elevated.`);
  }
  if (riskTags.includes("rumor-risk")) {
    parts.push("Narrative catalyst is unconfirmed — may be rumor or speculation.");
  }
  if (riskTags.includes("social-only")) {
    parts.push("No official news — signal is social/hype driven only.");
  }
  if (riskTags.includes("squeeze-risk")) {
    parts.push("Squeeze dynamics possible — reversals can be very violent.");
  }
  if (parts.length === 0) {
    parts.push(
      relativeVolume >= 5
        ? "Very high volume — distribution can cause sharp reversals. Watch for exhaustion."
        : "No critical risk flags identified. Monitor for confirmation before acting.",
    );
  }
  return parts.join(" ");
}

// ── Main signal builder ───────────────────────────────────────────────────────

let _signalIdCounter = 0;

/**
 * Build a complete CatalystSignal from a normalized CatalystCandidate.
 * This is the final step of the pipeline — pure transformation, no I/O.
 */
export function buildCatalystSignal(
  candidate: CatalystCandidate,
  nowMs = Date.now(),
): CatalystSignal {
  const breakdown: ScoreBreakdown = {
    prePumpVolumeScore:         computePrePumpVolumeScore(candidate.relativeVolume, candidate.changePct),
    priceSpikeScore:            computePriceSpikeScore(candidate.changePct, candidate.assetType),
    relativeVolumeScore:        computeRelativeVolumeScore(candidate.relativeVolume),
    mentionsSpikeScore:         computeMentionsSpikeScore(candidate.mentionSpikePct),
    keywordStrengthScore:       computeKeywordStrengthScore(candidate.matchedKeywords),
    sentimentScore:             computeSentimentScore(candidate.sentimentScore),
    sourceCredibilityScore:     candidate.sourceCredibility,
    floatOrVolatilityRiskScore: computeFloatVolatilityScore(candidate.float, candidate.changePct),
    freshnessScore:             computeFreshnessScore(candidate.detectedAtMs, nowMs),
  };

  const signalScore = computeFinalScore(breakdown);
  const category    = classifyCategory(
    candidate.matchedKeywords,
    candidate.assetType,
    candidate.relativeVolume,
    candidate.mentionSpikePct,
    candidate.changePct,
  );
  const confidence = computeConfidence(
    signalScore,
    candidate.matchedKeywords,
    candidate.matchedHeadlines.length,
    candidate.mentionSpikePct,
  );
  const { riskLevel, riskTags } = assessRisk(candidate, signalScore);

  return {
    id:               `csl-${nowMs}-${++_signalIdCounter}`,
    symbol:           candidate.symbol,
    assetType:        candidate.assetType,
    name:             candidate.name,
    category,
    currentPrice:     candidate.price,
    dailyChangePct:   candidate.changePct,
    relativeVolume:   candidate.relativeVolume,
    mentionSpikePct:  candidate.mentionSpikePct,
    signalScore,
    confidence,
    riskLevel,
    riskTags,
    sourceCredibility:  candidate.sourceCredibility,
    detectedAtMs:       candidate.detectedAtMs,
    matchedKeywords:    candidate.matchedKeywords,
    matchedHeadlines:   candidate.matchedHeadlines,
    matchedPosts:       candidate.matchedPosts,
    reasonSummary:      buildReasonSummary(candidate, breakdown),
    scoreBreakdown:     breakdown,
    whyInteresting:     buildWhyInteresting(candidate, category),
    whyDangerous:       buildWhyDangerous(riskTags, candidate.changePct, candidate.relativeVolume),
  };
}
