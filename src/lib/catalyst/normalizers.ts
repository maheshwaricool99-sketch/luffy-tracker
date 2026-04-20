/**
 * CATALYST SIGNALS — NORMALIZERS
 *
 * ISOLATION GUARANTEE: No trading module imports.
 *
 * Converts raw provider data into normalized CatalystCandidate objects
 * that can be scored by the scoring engine.
 */

import type {
  CatalystCandidate,
  MatchedHeadline,
  MatchedPost,
  RawCryptoMover,
  RawHeadline,
  RawSocialMention,
  RawStockMover,
} from "./types";
import { matchKeywordsFromTexts } from "./keywords";
import { sourceCredibilityScore } from "./config";

// ── Headline normalizer ───────────────────────────────────────────────────────

export function normalizeHeadline(raw: RawHeadline): MatchedHeadline {
  return {
    title: raw.title,
    source: raw.source,
    publishedAtMs: raw.publishedAtMs,
    url: raw.url,
    credibilityScore: sourceCredibilityScore(raw.source),
  };
}

// ── Stock mover normalizer ────────────────────────────────────────────────────

export function normalizeStockMover(
  raw: RawStockMover,
  headlines: RawHeadline[],
  socialMentions: RawSocialMention[],
  nowMs = Date.now(),
): CatalystCandidate {
  const relVol = raw.avgVolume > 0 ? raw.volume / raw.avgVolume : 1;

  const relevantHeadlines = headlines.filter(
    (h) => !h.symbols || h.symbols.length === 0 || h.symbols.includes(raw.symbol),
  );

  const texts = [
    raw.name ?? "",
    ...relevantHeadlines.map((h) => `${h.title} ${h.body ?? ""}`),
  ];
  const matchedKeywords = matchKeywordsFromTexts(texts, "stock");

  const matchedHeadlines: MatchedHeadline[] = relevantHeadlines
    .filter((h) => {
      const combined = `${h.title} ${h.body ?? ""}`.toLowerCase();
      // Include headline if it mentions the symbol or has keywords
      return (
        combined.includes(raw.symbol.toLowerCase()) ||
        (raw.name && combined.includes(raw.name.toLowerCase())) ||
        matchKeywordsFromTexts([combined], "stock").length > 0
      );
    })
    .map(normalizeHeadline)
    .sort((a, b) => b.publishedAtMs - a.publishedAtMs)
    .slice(0, 5);

  const social = socialMentions.find((s) => s.symbol === raw.symbol);
  const mentionSpikePct =
    social && social.mentionsBaseline > 0
      ? ((social.mentionsCount - social.mentionsBaseline) / social.mentionsBaseline) * 100
      : 0;

  const matchedPosts: MatchedPost[] =
    social?.samplePosts?.map((snippet) => ({
      snippet,
      platform: "social",
      publishedAtMs: nowMs,
    })) ?? [];

  // Normalize sentiment from -1..1 → 0..100
  const rawSentiment = social?.sentiment ?? 0;
  const sentimentScore = Math.round(((rawSentiment + 1) / 2) * 100);

  // Source credibility: average of best available headlines
  const credScores = matchedHeadlines.map((h) => h.credibilityScore);
  const sourceCredibility =
    credScores.length > 0
      ? Math.round(credScores.reduce((a, b) => a + b, 0) / credScores.length)
      : 20;

  return {
    symbol: raw.symbol,
    assetType: "stock",
    name: raw.name,
    price: raw.price,
    changePct: raw.changePct,
    relativeVolume: relVol,
    mentionSpikePct: Math.max(0, mentionSpikePct),
    sentimentScore,
    float: raw.float,
    marketCap: raw.marketCap,
    matchedKeywords,
    matchedHeadlines,
    matchedPosts,
    sourceCredibility,
    detectedAtMs: nowMs,
  };
}

// ── Crypto mover normalizer ───────────────────────────────────────────────────

export function normalizeCryptoMover(
  raw: RawCryptoMover,
  headlines: RawHeadline[],
  socialMentions: RawSocialMention[],
  nowMs = Date.now(),
): CatalystCandidate {
  const relVol = raw.avgVolume24h > 0 ? raw.volume24h / raw.avgVolume24h : 1;

  // Crypto symbols may appear as "BTC", "BTCUSDT", "BTC/USDT" — normalise
  const baseSymbol = raw.symbol.replace(/USDT$|\/USDT$|BUSD$/, "").toUpperCase();

  const relevantHeadlines = headlines.filter((h) => {
    if (!h.symbols || h.symbols.length === 0) {
      // Try name/symbol match in title
      const titleLower = h.title.toLowerCase();
      return (
        titleLower.includes(baseSymbol.toLowerCase()) ||
        (raw.name && titleLower.includes(raw.name.toLowerCase()))
      );
    }
    return h.symbols.some(
      (s) => s.toUpperCase() === raw.symbol.toUpperCase() || s.toUpperCase() === baseSymbol,
    );
  });

  const texts = [
    raw.name ?? "",
    baseSymbol,
    ...relevantHeadlines.map((h) => `${h.title} ${h.body ?? ""}`),
  ];
  const matchedKeywords = matchKeywordsFromTexts(texts, "crypto");

  const matchedHeadlines: MatchedHeadline[] = relevantHeadlines
    .map(normalizeHeadline)
    .sort((a, b) => b.publishedAtMs - a.publishedAtMs)
    .slice(0, 5);

  const social = socialMentions.find(
    (s) => s.symbol.toUpperCase() === raw.symbol.toUpperCase() || s.symbol.toUpperCase() === baseSymbol,
  );
  const mentionSpikePct =
    social && social.mentionsBaseline > 0
      ? ((social.mentionsCount - social.mentionsBaseline) / social.mentionsBaseline) * 100
      : 0;

  const matchedPosts: MatchedPost[] =
    social?.samplePosts?.map((snippet) => ({
      snippet,
      platform: "social",
      publishedAtMs: nowMs,
    })) ?? [];

  const rawSentiment = social?.sentiment ?? 0;
  const sentimentScore = Math.round(((rawSentiment + 1) / 2) * 100);

  const credScores = matchedHeadlines.map((h) => h.credibilityScore);
  const sourceCredibility =
    credScores.length > 0
      ? Math.round(credScores.reduce((a, b) => a + b, 0) / credScores.length)
      : 20;

  return {
    symbol: raw.symbol,
    assetType: "crypto",
    name: raw.name,
    price: raw.price,
    changePct: raw.changePct,
    relativeVolume: relVol,
    mentionSpikePct: Math.max(0, mentionSpikePct),
    sentimentScore,
    marketCap: raw.marketCap,
    matchedKeywords,
    matchedHeadlines,
    matchedPosts,
    sourceCredibility,
    detectedAtMs: nowMs,
  };
}
