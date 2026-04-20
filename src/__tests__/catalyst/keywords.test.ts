/**
 * Unit tests — Catalyst keywords matching system
 *
 * Tests pure functions only; no I/O, no trading module imports.
 */

import {
  matchKeywords,
  matchKeywordsFromTexts,
  computeKeywordStrengthScore,
  KEYWORDS,
} from "@/lib/catalyst/keywords";

describe("matchKeywords", () => {
  it("matches a strong AI pivot phrase in stock context", () => {
    const matches = matchKeywords("Company announces AI pivot and AI strategy overhaul", "stock");
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(matches.some((m) => m.theme === "ai-pivot")).toBe(true);
  });

  it("matches bitcoin treasury phrase for stocks", () => {
    const matches = matchKeywords("MicroStrategy announces bitcoin treasury expansion", "stock");
    expect(matches.some((m) => m.keyword === "bitcoin treasury")).toBe(true);
    expect(matches.some((m) => m.theme === "treasury")).toBe(true);
  });

  it("matches binance listing for crypto context", () => {
    const matches = matchKeywords("Token gets binance listing confirmed", "crypto");
    expect(matches.some((m) => m.keyword === "binance listing")).toBe(true);
    expect(matches.some((m) => m.theme === "listing")).toBe(true);
  });

  it("does NOT match stock-only keywords for crypto asset type", () => {
    const matches = matchKeywords("The stock has short squeeze potential", "crypto");
    // short squeeze applies to both, so let's check a stock-only term
    const stockOnlyMatches = matchKeywords("uplisting to nasdaq approved", "crypto");
    expect(stockOnlyMatches.some((m) => m.keyword === "uplisting")).toBe(false);
  });

  it("does NOT match crypto-only keywords for stock asset type", () => {
    const matches = matchKeywords("binance listing token burn mainnet launch", "stock");
    expect(matches.some((m) => m.keyword === "binance listing")).toBe(false);
    expect(matches.some((m) => m.keyword === "token burn")).toBe(false);
  });

  it("returns results sorted by weight descending", () => {
    const matches = matchKeywords("bitcoin treasury reverse merger uplisting", "stock");
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1].weight).toBeGreaterThanOrEqual(matches[i].weight);
    }
  });

  it("deduplicates the same keyword appearing multiple times", () => {
    const text = "bitcoin treasury bitcoin treasury bitcoin treasury";
    const matches = matchKeywords(text, "stock");
    const btcTreasury = matches.filter((m) => m.keyword === "bitcoin treasury");
    expect(btcTreasury.length).toBe(1);
  });

  it("returns empty array for text with no keyword matches", () => {
    const matches = matchKeywords("the sky is blue today", "stock");
    expect(matches).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    const matches = matchKeywords("BITCOIN TREASURY STRATEGY", "stock");
    expect(matches.some((m) => m.keyword === "bitcoin treasury")).toBe(true);
  });
});

describe("matchKeywordsFromTexts", () => {
  it("aggregates across multiple text sources", () => {
    const texts = [
      "Company signs strategic partnership with AI firm",
      "Token listed on binance exchange",
      "Short squeeze risk identified",
    ];
    const matches = matchKeywordsFromTexts(texts, "stock");
    expect(matches.some((m) => m.theme === "partnership")).toBe(true);
    expect(matches.some((m) => m.theme === "squeeze")).toBe(true);
  });

  it("deduplicates across texts, keeping highest weight", () => {
    const texts = [
      "binance listing confirmed",
      "new binance listing upcoming",
    ];
    const matches = matchKeywordsFromTexts(texts, "crypto");
    const listingMatches = matches.filter((m) => m.keyword === "binance listing");
    expect(listingMatches.length).toBe(1);
  });

  it("handles empty array", () => {
    expect(matchKeywordsFromTexts([], "stock")).toEqual([]);
  });

  it("handles array of empty strings", () => {
    expect(matchKeywordsFromTexts(["", "", ""], "crypto")).toEqual([]);
  });
});

describe("computeKeywordStrengthScore", () => {
  it("returns 0 for empty keyword array", () => {
    expect(computeKeywordStrengthScore([])).toBe(0);
  });

  it("returns a positive score for a single high-weight keyword", () => {
    const kws = [{ keyword: "bitcoin treasury", theme: "treasury", weight: 96 }];
    expect(computeKeywordStrengthScore(kws)).toBeGreaterThan(60);
  });

  it("rewards breadth — more keywords increases score", () => {
    const few = [{ keyword: "ai pivot", theme: "ai-pivot", weight: 92 }];
    const many = [
      { keyword: "ai pivot",            theme: "ai-pivot",    weight: 92 },
      { keyword: "strategic partnership",theme: "partnership", weight: 85 },
      { keyword: "binance listing",      theme: "listing",     weight: 96 },
      { keyword: "token burn",           theme: "tokenomics",  weight: 82 },
    ];
    expect(computeKeywordStrengthScore(many)).toBeGreaterThan(computeKeywordStrengthScore(few));
  });

  it("caps at 100", () => {
    const manyHighWeight = KEYWORDS.slice(0, 20).map((k) => ({
      keyword: k.keyword,
      theme: k.theme,
      weight: 100,
    }));
    expect(computeKeywordStrengthScore(manyHighWeight)).toBeLessThanOrEqual(100);
  });

  it("is always >= 0", () => {
    const kws = [{ keyword: "test", theme: "ai-pivot", weight: 0 }];
    expect(computeKeywordStrengthScore(kws)).toBeGreaterThanOrEqual(0);
  });
});

describe("KEYWORDS registry", () => {
  it("has keywords for both stock and crypto asset types", () => {
    const stockOnly = KEYWORDS.filter((k) => k.assetTypes.includes("stock") && !k.assetTypes.includes("crypto"));
    const cryptoOnly = KEYWORDS.filter((k) => k.assetTypes.includes("crypto") && !k.assetTypes.includes("stock"));
    expect(stockOnly.length).toBeGreaterThan(5);
    expect(cryptoOnly.length).toBeGreaterThan(5);
  });

  it("all weights are in range 0-100", () => {
    for (const kw of KEYWORDS) {
      expect(kw.weight).toBeGreaterThanOrEqual(0);
      expect(kw.weight).toBeLessThanOrEqual(100);
    }
  });

  it("all entries have non-empty keyword strings", () => {
    for (const kw of KEYWORDS) {
      expect(typeof kw.keyword).toBe("string");
      expect(kw.keyword.trim().length).toBeGreaterThan(0);
    }
  });
});
