/**
 * CATALYST SIGNALS — TYPE DEFINITIONS
 *
 * ISOLATION GUARANTEE:
 *   This file imports NOTHING from trading, execution, portfolio, or engine
 *   modules. All types are self-contained and read-only by design.
 *
 * These types must NEVER be imported by any trading/execution path.
 */

// ── Core enumerations ─────────────────────────────────────────────────────────

export type AssetType = "stock" | "crypto";

export type SignalCategory =
  | "pre-pump-buildup"
  | "narrative-pivot"
  | "partnership-deal"
  | "product-launch"
  | "treasury-reserve"
  | "meme-social-surge"
  | "possible-squeeze"
  | "news-breakout"
  | "listing-catalyst"
  | "onchain-ecosystem"
  | "unusual-volume";

export const SIGNAL_CATEGORY_LABELS: Record<SignalCategory, string> = {
  "pre-pump-buildup":   "Pre-Pump Accumulation",
  "narrative-pivot":    "Narrative Pivot",
  "partnership-deal":   "Partnership / Deal",
  "product-launch":     "Product / Launch",
  "treasury-reserve":   "Treasury / Reserve",
  "meme-social-surge":  "Meme / Social Surge",
  "possible-squeeze":   "Possible Squeeze",
  "news-breakout":      "News Breakout",
  "listing-catalyst":   "Listing / Catalyst",
  "onchain-ecosystem":  "On-Chain / Ecosystem",
  "unusual-volume":     "Unusual Volume",
};

export type RiskLevel = "low" | "medium" | "high" | "extreme";

export type RiskTag =
  | "hype-only"
  | "unconfirmed"
  | "social-only"
  | "official-news"
  | "low-float-danger"
  | "squeeze-risk"
  | "rumor-risk"
  | "extreme-volatility"
  | "thin-liquidity"
  | "strong-catalyst"
  | "likely-pump-dump";

// ── Score model ───────────────────────────────────────────────────────────────

/** Explainable breakdown of each component contributing to signalScore */
export type ScoreBreakdown = {
  prePumpVolumeScore?: number;        // 0-100 — LEADING: high volume + flat price (best predictor)
  priceSpikeScore: number;            // 0-100 — kept for display; weight=0 (lagging indicator)
  relativeVolumeScore: number;        // 0-100
  mentionsSpikeScore: number;         // 0-100
  keywordStrengthScore: number;       // 0-100
  sentimentScore: number;             // 0-100
  sourceCredibilityScore: number;     // 0-100
  floatOrVolatilityRiskScore: number; // 0-100
  freshnessScore: number;             // 0-100
};

// ── Evidence types ────────────────────────────────────────────────────────────

export type MatchedKeyword = {
  keyword: string;
  theme: string;
  weight: number; // 0-100
};

export type MatchedHeadline = {
  title: string;
  source: string;
  publishedAtMs: number;
  url?: string;
  credibilityScore: number; // 0-100
};

export type MatchedPost = {
  snippet: string;
  platform: string;
  publishedAtMs: number;
  engagement?: number;
};

// ── Signal (final output) ─────────────────────────────────────────────────────

/**
 * A detected catalyst signal.
 *
 * READ-ONLY: This type must never be used to place, modify, or close a trade.
 * It is display/discovery data only.
 */
export type CatalystSignal = {
  id: string;
  symbol: string;
  assetType: AssetType;
  name?: string;
  category: SignalCategory;
  currentPrice: number;
  dailyChangePct: number;
  relativeVolume: number;    // 1.0 = normal; 3.0 = 3× above normal
  mentionSpikePct: number;   // % above baseline (0 if no data)
  signalScore: number;       // 0-100
  confidence: number;        // 0-100
  riskLevel: RiskLevel;
  riskTags: RiskTag[];
  sourceCredibility: number; // 0-100
  detectedAtMs: number;
  matchedKeywords: MatchedKeyword[];
  matchedHeadlines: MatchedHeadline[];
  matchedPosts: MatchedPost[];
  reasonSummary: string;
  scoreBreakdown: ScoreBreakdown;
  whyInteresting: string;
  whyDangerous: string;
};

// ── Provider health ───────────────────────────────────────────────────────────

export type ProviderStatus = {
  name: string;
  healthy: boolean;
  lastSuccessMs: number;
  lastErrorMs: number;
  errorMessage?: string;
};

// ── API response ──────────────────────────────────────────────────────────────

/** Shape returned by GET /api/catalyst-signals — no trade or order data */
export type CatalystSignalsResponse = {
  timestamp: number;
  totalCandidates: number;
  topSignals: CatalystSignal[];
  recentSignals: CatalystSignal[];
  providerHealth: ProviderStatus[];
  warnings: string[];
  lastUpdated: number;
};

// ── Raw inputs from external data providers ───────────────────────────────────

export type RawStockMover = {
  symbol: string;
  name?: string;
  price: number;
  changePct: number;
  volume: number;
  avgVolume: number;
  float?: number;
  marketCap?: number;
};

export type RawCryptoMover = {
  symbol: string;
  name?: string;
  price: number;
  changePct: number;
  volume24h: number;
  avgVolume24h: number;
  marketCap?: number;
};

export type RawHeadline = {
  title: string;
  body?: string;
  source: string;
  publishedAtMs: number;
  symbols?: string[];
  url?: string;
};

export type RawSocialMention = {
  symbol: string;
  mentionsCount: number;
  mentionsBaseline: number;
  sentiment: number; // -1 to +1
  samplePosts?: string[];
};

// ── Normalized intermediate (pre-scoring) ────────────────────────────────────

/** Internal working type — normalized from raw inputs, ready for scoring */
export type CatalystCandidate = {
  symbol: string;
  assetType: AssetType;
  name?: string;
  price: number;
  changePct: number;
  relativeVolume: number;
  mentionSpikePct: number;
  sentimentScore: number;   // 0-100 (from -1..1 normalized)
  float?: number;
  marketCap?: number;
  matchedKeywords: MatchedKeyword[];
  matchedHeadlines: MatchedHeadline[];
  matchedPosts: MatchedPost[];
  sourceCredibility: number;
  detectedAtMs: number;
};
