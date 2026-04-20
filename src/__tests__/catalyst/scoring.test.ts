/**
 * Unit tests — Catalyst scoring engine
 *
 * Tests pure scoring functions. No I/O, no trading module imports.
 */

import {
  computePriceSpikeScore,
  computeRelativeVolumeScore,
  computeMentionsSpikeScore,
  computeFreshnessScore,
  computeFloatVolatilityScore,
  computeFinalScore,
  computeConfidence,
  classifyCategory,
  assessRisk,
  buildReasonSummary,
  buildCatalystSignal,
} from "@/lib/catalyst/scoring";
import type { CatalystCandidate, ScoreBreakdown } from "@/lib/catalyst/types";

// ── Price spike score ─────────────────────────────────────────────────────────

describe("computePriceSpikeScore", () => {
  it("returns 100 for extreme stock move (50%+)", () => {
    expect(computePriceSpikeScore(55, "stock")).toBe(100);
  });

  it("returns 0 for no move", () => {
    expect(computePriceSpikeScore(0, "stock")).toBe(0);
  });

  it("is symmetric — negative moves score the same as positive", () => {
    expect(computePriceSpikeScore(-30, "stock")).toBe(computePriceSpikeScore(30, "stock"));
  });

  it("stock scores higher for same absolute % vs crypto (different thresholds)", () => {
    // 20% is bigger signal for a stock than for crypto
    const stockScore  = computePriceSpikeScore(20, "stock");
    const cryptoScore = computePriceSpikeScore(20, "crypto");
    expect(stockScore).toBeGreaterThan(cryptoScore);
  });

  it("returns a value between 0 and 100", () => {
    for (const pct of [-100, -50, -10, 0, 5, 15, 30, 100]) {
      const s = computePriceSpikeScore(pct, "stock");
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
      const c = computePriceSpikeScore(pct, "crypto");
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(100);
    }
  });
});

// ── Relative volume score ─────────────────────────────────────────────────────

describe("computeRelativeVolumeScore", () => {
  it("returns 100 for 20× volume", () => {
    expect(computeRelativeVolumeScore(20)).toBe(100);
  });

  it("returns 0 for 1× (normal) volume", () => {
    expect(computeRelativeVolumeScore(1)).toBe(0);
  });

  it("returns 0 for volume below normal", () => {
    expect(computeRelativeVolumeScore(0.5)).toBe(0);
  });

  it("increases monotonically with relative volume", () => {
    const volumes = [1, 1.5, 2, 3, 5, 7, 10, 20];
    for (let i = 1; i < volumes.length; i++) {
      expect(computeRelativeVolumeScore(volumes[i])).toBeGreaterThanOrEqual(
        computeRelativeVolumeScore(volumes[i - 1]),
      );
    }
  });
});

// ── Mentions spike score ──────────────────────────────────────────────────────

describe("computeMentionsSpikeScore", () => {
  it("returns 0 for no spike", () => {
    expect(computeMentionsSpikeScore(0)).toBe(0);
    expect(computeMentionsSpikeScore(-10)).toBe(0);
  });

  it("returns 100 for 1000%+ spike", () => {
    expect(computeMentionsSpikeScore(1000)).toBe(100);
    expect(computeMentionsSpikeScore(2000)).toBe(100);
  });

  it("increases with spike percentage", () => {
    expect(computeMentionsSpikeScore(500)).toBeGreaterThan(computeMentionsSpikeScore(100));
  });
});

// ── Freshness score ───────────────────────────────────────────────────────────

describe("computeFreshnessScore", () => {
  const NOW = Date.now();
  const H = 60 * 60_000;

  it("returns 100 for very recent signal (< 1h)", () => {
    expect(computeFreshnessScore(NOW - 10 * 60_000, NOW)).toBe(100);
  });

  it("decays as signal ages", () => {
    const score1h   = computeFreshnessScore(NOW - 1 * H, NOW);
    const score4h   = computeFreshnessScore(NOW - 4 * H, NOW);
    const score12h  = computeFreshnessScore(NOW - 12 * H, NOW);
    const score24h  = computeFreshnessScore(NOW - 24 * H, NOW);
    expect(score1h).toBeGreaterThan(score4h);
    expect(score4h).toBeGreaterThan(score12h);
    expect(score12h).toBeGreaterThan(score24h);
  });

  it("returns a small non-zero score for very old signals", () => {
    const score = computeFreshnessScore(NOW - 48 * H, NOW);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(20);
  });
});

// ── Float / volatility score ──────────────────────────────────────────────────

describe("computeFloatVolatilityScore", () => {
  it("gives high score for micro-float (<5M)", () => {
    const score = computeFloatVolatilityScore(1_000_000, 10);
    expect(score).toBeGreaterThan(40);
  });

  it("gives zero bonus when float is undefined and change is small", () => {
    expect(computeFloatVolatilityScore(undefined, 0)).toBe(0);
  });

  it("caps at 100", () => {
    expect(computeFloatVolatilityScore(100_000, 60)).toBeLessThanOrEqual(100);
  });
});

// ── Final score ───────────────────────────────────────────────────────────────

describe("computeFinalScore", () => {
  const allZero: ScoreBreakdown = {
    priceSpikeScore:            0,
    relativeVolumeScore:        0,
    mentionsSpikeScore:         0,
    keywordStrengthScore:       0,
    sentimentScore:             0,
    sourceCredibilityScore:     0,
    floatOrVolatilityRiskScore: 0,
    freshnessScore:             0,
  };

  const allHigh: ScoreBreakdown = {
    priceSpikeScore:            90,
    relativeVolumeScore:        85,
    mentionsSpikeScore:         75,
    keywordStrengthScore:       88,
    sentimentScore:             80,
    sourceCredibilityScore:     90,
    floatOrVolatilityRiskScore: 60,
    freshnessScore:             100,
  };

  it("returns 0 when all components are 0", () => {
    expect(computeFinalScore(allZero)).toBe(0);
  });

  it("returns a score close to 100 when all components are high", () => {
    expect(computeFinalScore(allHigh)).toBeGreaterThan(80);
  });

  it("is always between 0 and 100", () => {
    expect(computeFinalScore(allZero)).toBeGreaterThanOrEqual(0);
    expect(computeFinalScore(allHigh)).toBeLessThanOrEqual(100);
  });
});

// ── Confidence ────────────────────────────────────────────────────────────────

describe("computeConfidence", () => {
  it("increases with headline count", () => {
    const noHeadlines   = computeConfidence(60, [], 0, 50);
    const withHeadlines = computeConfidence(60, [], 2, 50);
    expect(withHeadlines).toBeGreaterThan(noHeadlines);
  });

  it("increases with keyword count (>= 3)", () => {
    const fewKws  = computeConfidence(60, [{ keyword: "ai", theme: "ai-pivot", weight: 80 }], 0, 0);
    const manyKws = computeConfidence(60, Array(5).fill({ keyword: "test", theme: "ai-pivot", weight: 80 }), 0, 0);
    expect(manyKws).toBeGreaterThan(fewKws);
  });

  it("is always between 0 and 100", () => {
    expect(computeConfidence(100, [], 5, 1000)).toBeLessThanOrEqual(100);
    expect(computeConfidence(0, [], 0, 0)).toBeGreaterThanOrEqual(0);
  });
});

// ── Category classification ───────────────────────────────────────────────────

describe("classifyCategory", () => {
  it("classifies treasury keywords as treasury-reserve", () => {
    const kws = [{ keyword: "bitcoin treasury", theme: "treasury", weight: 96 }];
    expect(classifyCategory(kws, "stock", 2, 0)).toBe("treasury-reserve");
  });

  it("classifies AI pivot keywords as narrative-pivot", () => {
    const kws = [{ keyword: "ai pivot", theme: "ai-pivot", weight: 92 }];
    expect(classifyCategory(kws, "stock", 2, 0)).toBe("narrative-pivot");
  });

  it("classifies listing keywords as listing-catalyst for crypto", () => {
    const kws = [{ keyword: "binance listing", theme: "listing", weight: 96 }];
    expect(classifyCategory(kws, "crypto", 5, 0)).toBe("listing-catalyst");
  });

  it("classifies squeeze themes as possible-squeeze", () => {
    const kws = [{ keyword: "short squeeze", theme: "squeeze", weight: 90 }];
    expect(classifyCategory(kws, "stock", 3, 0)).toBe("possible-squeeze");
  });

  it("classifies social hype with high mentions as meme-social-surge", () => {
    const kws = [{ keyword: "wallstreetbets", theme: "social-hype", weight: 82 }];
    expect(classifyCategory(kws, "stock", 2, 350)).toBe("meme-social-surge");
  });

  it("falls back to unusual-volume when no strong signal", () => {
    expect(classifyCategory([], "stock", 1, 0)).toBe("unusual-volume");
  });
});

// ── Risk assessment ───────────────────────────────────────────────────────────

describe("assessRisk", () => {
  const baseCandidate: CatalystCandidate = {
    symbol: "TEST",
    assetType: "stock",
    price: 10,
    changePct: 5,
    relativeVolume: 2,
    mentionSpikePct: 0,
    sentimentScore: 50,
    matchedKeywords: [],
    matchedHeadlines: [],
    matchedPosts: [],
    sourceCredibility: 50,
    detectedAtMs: Date.now(),
  };

  it("adds social-only tag when no headlines and has mentions", () => {
    const c = { ...baseCandidate, mentionSpikePct: 200 };
    const { riskTags } = assessRisk(c, 50);
    expect(riskTags).toContain("social-only");
  });

  it("adds hype-only tag when no headlines and no mentions", () => {
    const { riskTags } = assessRisk(baseCandidate, 50);
    expect(riskTags).toContain("hype-only");
  });

  it("adds official-news tag when high-credibility headline present", () => {
    const c: CatalystCandidate = {
      ...baseCandidate,
      matchedHeadlines: [{
        title: "Official Announcement",
        source: "businesswire",
        publishedAtMs: Date.now(),
        credibilityScore: 95,
      }],
    };
    const { riskTags } = assessRisk(c, 60);
    expect(riskTags).toContain("official-news");
  });

  it("adds low-float-danger for very small float stocks", () => {
    const c = { ...baseCandidate, float: 500_000 };
    const { riskTags, riskLevel } = assessRisk(c, 50);
    expect(riskTags).toContain("low-float-danger");
    expect(["high", "extreme"]).toContain(riskLevel);
  });

  it("adds extreme-volatility for large stock moves", () => {
    const c = { ...baseCandidate, changePct: 45 };
    const { riskTags, riskLevel } = assessRisk(c, 50);
    expect(riskTags).toContain("extreme-volatility");
    expect(riskLevel).toBe("extreme");
  });

  it("adds likely-pump-dump for social-driven high volume with no official news", () => {
    const c = {
      ...baseCandidate,
      relativeVolume: 8,
      mentionSpikePct: 500,
      matchedKeywords: [{ keyword: "wallstreetbets", theme: "social-hype", weight: 82 }],
    };
    const { riskTags } = assessRisk(c, 70);
    expect(riskTags).toContain("likely-pump-dump");
  });
});

// ── buildCatalystSignal ───────────────────────────────────────────────────────

describe("buildCatalystSignal", () => {
  const candidate: CatalystCandidate = {
    symbol: "MSTR",
    assetType: "stock",
    name: "MicroStrategy",
    price: 1320,
    changePct: 8.9,
    relativeVolume: 2.5,
    mentionSpikePct: 395,
    sentimentScore: 72,
    float: 14_500_000,
    matchedKeywords: [
      { keyword: "bitcoin treasury", theme: "treasury", weight: 96 },
      { keyword: "btc reserve",      theme: "treasury", weight: 96 },
    ],
    matchedHeadlines: [{
      title: "MicroStrategy Buys Bitcoin — Treasury Expands",
      source: "businesswire",
      publishedAtMs: Date.now() - 60_000,
      credibilityScore: 95,
    }],
    matchedPosts: [],
    sourceCredibility: 95,
    detectedAtMs: Date.now() - 60_000,
  };

  let signal: ReturnType<typeof buildCatalystSignal>;
  beforeAll(() => { signal = buildCatalystSignal(candidate); });

  it("has a non-empty id starting with csl-", () => {
    expect(signal.id).toMatch(/^csl-/);
  });

  it("has signalScore between 0 and 100", () => {
    expect(signal.signalScore).toBeGreaterThanOrEqual(0);
    expect(signal.signalScore).toBeLessThanOrEqual(100);
  });

  it("has confidence between 0 and 100", () => {
    expect(signal.confidence).toBeGreaterThanOrEqual(0);
    expect(signal.confidence).toBeLessThanOrEqual(100);
  });

  it("classifies as treasury-reserve", () => {
    expect(signal.category).toBe("treasury-reserve");
  });

  it("has a non-empty reasonSummary", () => {
    expect(signal.reasonSummary.length).toBeGreaterThan(0);
  });

  it("has whyInteresting and whyDangerous", () => {
    expect(signal.whyInteresting.length).toBeGreaterThan(0);
    expect(signal.whyDangerous.length).toBeGreaterThan(0);
  });

  it("has all scoreBreakdown fields defined and in 0-100 range", () => {
    const bd = signal.scoreBreakdown;
    for (const [key, val] of Object.entries(bd)) {
      expect(typeof val).toBe("number");
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(100);
    }
  });

  it("has official-news risk tag (high-credibility headline)", () => {
    expect(signal.riskTags).toContain("official-news");
  });

  it("passthrough: symbol, assetType, price, changePct match candidate", () => {
    expect(signal.symbol).toBe("MSTR");
    expect(signal.assetType).toBe("stock");
    expect(signal.currentPrice).toBe(1320);
    expect(signal.dailyChangePct).toBe(8.9);
  });
});
