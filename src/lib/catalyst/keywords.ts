/**
 * CATALYST SIGNALS — KEYWORD MATCHING SYSTEM
 *
 * ISOLATION GUARANTEE:
 *   Pure functions only. Zero imports from trading, execution, or engine modules.
 *
 * Design:
 *   Keywords are grouped into themes. Each keyword has a weight (0-100) and
 *   applies to one or both asset types (stock / crypto). The scoring engine
 *   uses keyword strength to compute keywordStrengthScore.
 */

import type { AssetType, MatchedKeyword } from "./types";

export type KeywordTheme =
  | "ai-pivot"
  | "partnership"
  | "acquisition"
  | "uplisting"
  | "regulatory"
  | "buyback"
  | "treasury"
  | "squeeze"
  | "listing"
  | "tokenomics"
  | "ecosystem"
  | "social-hype"
  | "product"
  | "defi";

type WeightedKeyword = {
  keyword: string;
  theme: KeywordTheme;
  weight: number;           // 0-100: importance of this keyword
  assetTypes: AssetType[];  // which asset classes this applies to
};

// ── Keyword registry ──────────────────────────────────────────────────────────

export const KEYWORDS: WeightedKeyword[] = [
  // ── AI pivot ──────────────────────────────────────────────────────────────
  { keyword: "pivot to ai",            theme: "ai-pivot",    weight: 92, assetTypes: ["stock"] },
  { keyword: "ai strategy",            theme: "ai-pivot",    weight: 88, assetTypes: ["stock"] },
  { keyword: "ai company",             theme: "ai-pivot",    weight: 82, assetTypes: ["stock"] },
  { keyword: "ai transformation",      theme: "ai-pivot",    weight: 88, assetTypes: ["stock"] },
  { keyword: "pivot to artificial",    theme: "ai-pivot",    weight: 90, assetTypes: ["stock"] },
  { keyword: "ai pivot",               theme: "ai-pivot",    weight: 92, assetTypes: ["stock"] },
  { keyword: "ai integration",         theme: "ai-pivot",    weight: 75, assetTypes: ["stock", "crypto"] },
  { keyword: "ai agent",               theme: "ai-pivot",    weight: 72, assetTypes: ["stock", "crypto"] },
  { keyword: "artificial intelligence",theme: "ai-pivot",    weight: 68, assetTypes: ["stock", "crypto"] },
  { keyword: "machine learning",       theme: "ai-pivot",    weight: 58, assetTypes: ["stock"] },
  { keyword: "large language model",   theme: "ai-pivot",    weight: 68, assetTypes: ["stock", "crypto"] },
  { keyword: "generative ai",          theme: "ai-pivot",    weight: 78, assetTypes: ["stock", "crypto"] },
  { keyword: "ai infrastructure",      theme: "ai-pivot",    weight: 80, assetTypes: ["stock", "crypto"] },

  // ── Partnerships / deals ──────────────────────────────────────────────────
  { keyword: "partnership announced",  theme: "partnership", weight: 86, assetTypes: ["stock", "crypto"] },
  { keyword: "strategic partnership",  theme: "partnership", weight: 86, assetTypes: ["stock", "crypto"] },
  { keyword: "signs agreement",        theme: "partnership", weight: 82, assetTypes: ["stock", "crypto"] },
  { keyword: "signed agreement",       theme: "partnership", weight: 82, assetTypes: ["stock", "crypto"] },
  { keyword: "letter of intent",       theme: "partnership", weight: 76, assetTypes: ["stock"] },
  { keyword: "memorandum of understanding", theme: "partnership", weight: 72, assetTypes: ["stock"] },
  { keyword: "joint venture",          theme: "partnership", weight: 76, assetTypes: ["stock"] },
  { keyword: "collaboration with",     theme: "partnership", weight: 55, assetTypes: ["stock", "crypto"] },
  { keyword: "integration with",       theme: "partnership", weight: 52, assetTypes: ["stock", "crypto"] },
  { keyword: "powered by",             theme: "partnership", weight: 44, assetTypes: ["stock", "crypto"] },

  // ── Acquisitions ──────────────────────────────────────────────────────────
  { keyword: "acquires",               theme: "acquisition", weight: 86, assetTypes: ["stock"] },
  { keyword: "merger",                 theme: "acquisition", weight: 86, assetTypes: ["stock"] },
  { keyword: "reverse merger",         theme: "acquisition", weight: 92, assetTypes: ["stock"] },
  { keyword: "takeover",               theme: "acquisition", weight: 82, assetTypes: ["stock"] },
  { keyword: "acquisition of",         theme: "acquisition", weight: 82, assetTypes: ["stock"] },
  { keyword: "to be acquired",         theme: "acquisition", weight: 88, assetTypes: ["stock"] },
  { keyword: "buyout",                 theme: "acquisition", weight: 84, assetTypes: ["stock"] },

  // ── Uplisting ─────────────────────────────────────────────────────────────
  { keyword: "uplisting",              theme: "uplisting",   weight: 90, assetTypes: ["stock"] },
  { keyword: "nasdaq listing",         theme: "uplisting",   weight: 90, assetTypes: ["stock"] },
  { keyword: "nyse listing",           theme: "uplisting",   weight: 90, assetTypes: ["stock"] },
  { keyword: "uplists to",             theme: "uplisting",   weight: 90, assetTypes: ["stock"] },
  { keyword: "moves to nasdaq",        theme: "uplisting",   weight: 90, assetTypes: ["stock"] },

  // ── Regulatory / approval ─────────────────────────────────────────────────
  { keyword: "fda approved",           theme: "regulatory",  weight: 88, assetTypes: ["stock"] },
  { keyword: "fda approval",           theme: "regulatory",  weight: 88, assetTypes: ["stock"] },
  { keyword: "sec filing",             theme: "regulatory",  weight: 65, assetTypes: ["stock"] },
  { keyword: "sec approved",           theme: "regulatory",  weight: 82, assetTypes: ["stock"] },
  { keyword: "regulatory approval",    theme: "regulatory",  weight: 80, assetTypes: ["stock", "crypto"] },
  { keyword: "approved by",            theme: "regulatory",  weight: 68, assetTypes: ["stock", "crypto"] },
  { keyword: "clearance granted",      theme: "regulatory",  weight: 75, assetTypes: ["stock"] },

  // ── Buyback ───────────────────────────────────────────────────────────────
  { keyword: "buyback",                theme: "buyback",     weight: 80, assetTypes: ["stock"] },
  { keyword: "share repurchase",       theme: "buyback",     weight: 80, assetTypes: ["stock"] },
  { keyword: "repurchase program",     theme: "buyback",     weight: 78, assetTypes: ["stock"] },
  { keyword: "buys back shares",       theme: "buyback",     weight: 80, assetTypes: ["stock"] },

  // ── Treasury / reserve (stocks / corporate crypto) ────────────────────────
  { keyword: "bitcoin treasury",       theme: "treasury",    weight: 96, assetTypes: ["stock"] },
  { keyword: "ethereum treasury",      theme: "treasury",    weight: 92, assetTypes: ["stock"] },
  { keyword: "crypto treasury",        theme: "treasury",    weight: 92, assetTypes: ["stock"] },
  { keyword: "btc reserve",            theme: "treasury",    weight: 96, assetTypes: ["stock"] },
  { keyword: "digital asset reserve",  theme: "treasury",    weight: 88, assetTypes: ["stock"] },
  { keyword: "treasury strategy",      theme: "treasury",    weight: 86, assetTypes: ["stock"] },
  { keyword: "bitcoin reserve",        theme: "treasury",    weight: 96, assetTypes: ["stock", "crypto"] },
  { keyword: "adds bitcoin",           theme: "treasury",    weight: 90, assetTypes: ["stock"] },
  { keyword: "purchases bitcoin",      theme: "treasury",    weight: 90, assetTypes: ["stock"] },
  // Crypto treasury/protocol level
  { keyword: "treasury",               theme: "treasury",    weight: 65, assetTypes: ["crypto"] },
  { keyword: "protocol treasury",      theme: "treasury",    weight: 72, assetTypes: ["crypto"] },

  // ── Short squeeze ─────────────────────────────────────────────────────────
  { keyword: "short squeeze",          theme: "squeeze",     weight: 90, assetTypes: ["stock", "crypto"] },
  { keyword: "gamma squeeze",          theme: "squeeze",     weight: 86, assetTypes: ["stock"] },
  { keyword: "heavily shorted",        theme: "squeeze",     weight: 82, assetTypes: ["stock"] },
  { keyword: "high short interest",    theme: "squeeze",     weight: 82, assetTypes: ["stock"] },
  { keyword: "record volume",          theme: "squeeze",     weight: 72, assetTypes: ["stock", "crypto"] },
  { keyword: "most shorted",           theme: "squeeze",     weight: 80, assetTypes: ["stock"] },
  { keyword: "forced to cover",        theme: "squeeze",     weight: 86, assetTypes: ["stock"] },

  // ── Exchange listings (crypto) ────────────────────────────────────────────
  { keyword: "binance listing",        theme: "listing",     weight: 96, assetTypes: ["crypto"] },
  { keyword: "listed on binance",      theme: "listing",     weight: 96, assetTypes: ["crypto"] },
  { keyword: "coinbase listing",       theme: "listing",     weight: 93, assetTypes: ["crypto"] },
  { keyword: "listed on coinbase",     theme: "listing",     weight: 93, assetTypes: ["crypto"] },
  { keyword: "bybit listing",          theme: "listing",     weight: 86, assetTypes: ["crypto"] },
  { keyword: "okx listing",            theme: "listing",     weight: 84, assetTypes: ["crypto"] },
  { keyword: "kraken listing",         theme: "listing",     weight: 82, assetTypes: ["crypto"] },
  { keyword: "new listing",            theme: "listing",     weight: 70, assetTypes: ["crypto"] },
  { keyword: "now available on",       theme: "listing",     weight: 68, assetTypes: ["crypto"] },
  { keyword: "gate.io listing",        theme: "listing",     weight: 72, assetTypes: ["crypto"] },
  { keyword: "kucoin listing",         theme: "listing",     weight: 72, assetTypes: ["crypto"] },

  // ── Tokenomics ────────────────────────────────────────────────────────────
  { keyword: "token burn",             theme: "tokenomics",  weight: 82, assetTypes: ["crypto"] },
  { keyword: "buyback and burn",       theme: "tokenomics",  weight: 86, assetTypes: ["crypto"] },
  { keyword: "deflationary",           theme: "tokenomics",  weight: 72, assetTypes: ["crypto"] },
  { keyword: "staking launch",         theme: "tokenomics",  weight: 76, assetTypes: ["crypto"] },
  { keyword: "staking rewards",        theme: "tokenomics",  weight: 66, assetTypes: ["crypto"] },
  { keyword: "airdrop",                theme: "tokenomics",  weight: 70, assetTypes: ["crypto"] },
  { keyword: "token unlock",           theme: "tokenomics",  weight: 72, assetTypes: ["crypto"] },
  { keyword: "vesting cliff",          theme: "tokenomics",  weight: 66, assetTypes: ["crypto"] },
  { keyword: "supply reduction",       theme: "tokenomics",  weight: 75, assetTypes: ["crypto"] },
  { keyword: "emissions cut",          theme: "tokenomics",  weight: 72, assetTypes: ["crypto"] },

  // ── Ecosystem / on-chain ──────────────────────────────────────────────────
  { keyword: "mainnet launch",         theme: "ecosystem",   weight: 86, assetTypes: ["crypto"] },
  { keyword: "mainnet",                theme: "ecosystem",   weight: 76, assetTypes: ["crypto"] },
  { keyword: "testnet",                theme: "ecosystem",   weight: 62, assetTypes: ["crypto"] },
  { keyword: "ecosystem fund",         theme: "ecosystem",   weight: 76, assetTypes: ["crypto"] },
  { keyword: "incentive program",      theme: "ecosystem",   weight: 66, assetTypes: ["crypto"] },
  { keyword: "grants program",         theme: "ecosystem",   weight: 66, assetTypes: ["crypto"] },
  { keyword: "whale accumulation",     theme: "ecosystem",   weight: 76, assetTypes: ["crypto"] },
  { keyword: "on-chain activity",      theme: "ecosystem",   weight: 65, assetTypes: ["crypto"] },
  { keyword: "tvl increase",           theme: "ecosystem",   weight: 72, assetTypes: ["crypto"] },
  { keyword: "total value locked",     theme: "ecosystem",   weight: 68, assetTypes: ["crypto"] },
  { keyword: "network upgrade",        theme: "ecosystem",   weight: 72, assetTypes: ["crypto"] },
  { keyword: "protocol upgrade",       theme: "ecosystem",   weight: 72, assetTypes: ["crypto"] },

  // ── DeFi / ETF ────────────────────────────────────────────────────────────
  { keyword: "etf approval",           theme: "defi",        weight: 92, assetTypes: ["crypto"] },
  { keyword: "bitcoin etf",            theme: "defi",        weight: 92, assetTypes: ["crypto"] },
  { keyword: "spot etf",               theme: "defi",        weight: 90, assetTypes: ["crypto"] },
  { keyword: "etf filing",             theme: "defi",        weight: 84, assetTypes: ["crypto"] },
  { keyword: "defi",                   theme: "defi",        weight: 52, assetTypes: ["crypto"] },
  { keyword: "yield farming",          theme: "defi",        weight: 58, assetTypes: ["crypto"] },

  // ── Product launches ──────────────────────────────────────────────────────
  { keyword: "product launch",         theme: "product",     weight: 74, assetTypes: ["stock", "crypto"] },
  { keyword: "v2 launch",              theme: "product",     weight: 72, assetTypes: ["crypto"] },
  { keyword: "releases",               theme: "product",     weight: 50, assetTypes: ["stock", "crypto"] },
  { keyword: "new product",            theme: "product",     weight: 65, assetTypes: ["stock", "crypto"] },
  { keyword: "app launch",             theme: "product",     weight: 68, assetTypes: ["stock", "crypto"] },
  { keyword: "platform goes live",     theme: "product",     weight: 72, assetTypes: ["stock", "crypto"] },
  { keyword: "beta launch",            theme: "product",     weight: 60, assetTypes: ["stock", "crypto"] },

  // ── Social hype ───────────────────────────────────────────────────────────
  { keyword: "wallstreetbets",         theme: "social-hype", weight: 82, assetTypes: ["stock"] },
  { keyword: "wsb",                    theme: "social-hype", weight: 78, assetTypes: ["stock"] },
  { keyword: "meme stock",             theme: "social-hype", weight: 82, assetTypes: ["stock"] },
  { keyword: "viral",                  theme: "social-hype", weight: 68, assetTypes: ["stock", "crypto"] },
  { keyword: "trending on",            theme: "social-hype", weight: 65, assetTypes: ["stock", "crypto"] },
  { keyword: "to the moon",            theme: "social-hype", weight: 58, assetTypes: ["crypto"] },
  { keyword: "aping in",               theme: "social-hype", weight: 62, assetTypes: ["crypto"] },
  { keyword: "fomo",                   theme: "social-hype", weight: 58, assetTypes: ["stock", "crypto"] },
  { keyword: "reddit",                 theme: "social-hype", weight: 62, assetTypes: ["stock"] },
  { keyword: "elon",                   theme: "social-hype", weight: 72, assetTypes: ["stock", "crypto"] },
  { keyword: "elon musk",              theme: "social-hype", weight: 82, assetTypes: ["stock", "crypto"] },
];

// ── Matching functions ────────────────────────────────────────────────────────

/**
 * Match a single text string against the keyword registry.
 * Returns matched keywords sorted by weight descending.
 */
export function matchKeywords(text: string, assetType: AssetType): MatchedKeyword[] {
  const lower = text.toLowerCase();
  const seen = new Set<string>();
  const matches: MatchedKeyword[] = [];

  for (const kw of KEYWORDS) {
    if (!kw.assetTypes.includes(assetType)) continue;
    if (seen.has(kw.keyword)) continue;
    if (lower.includes(kw.keyword)) {
      seen.add(kw.keyword);
      matches.push({ keyword: kw.keyword, theme: kw.theme, weight: kw.weight });
    }
  }

  return matches.sort((a, b) => b.weight - a.weight);
}

/**
 * Aggregate keyword matches across multiple text sources (headlines, posts, etc.)
 * Deduplicates by keyword string, keeping the highest weight.
 */
export function matchKeywordsFromTexts(texts: string[], assetType: AssetType): MatchedKeyword[] {
  const combined = new Map<string, MatchedKeyword>();
  for (const text of texts) {
    for (const match of matchKeywords(text, assetType)) {
      const existing = combined.get(match.keyword);
      if (!existing || existing.weight < match.weight) {
        combined.set(match.keyword, match);
      }
    }
  }
  return [...combined.values()].sort((a, b) => b.weight - a.weight);
}

/**
 * Compute a 0-100 strength score from a set of matched keywords.
 *
 * Formula: topWeight * 0.78 + breadthBonus (up to 22 points).
 * Breadth bonus rewards diversity of keyword matches.
 */
export function computeKeywordStrengthScore(keywords: MatchedKeyword[]): number {
  if (keywords.length === 0) return 0;
  const topWeight = Math.max(...keywords.map((k) => k.weight));
  const breadthBonus = Math.min(22, keywords.length * 5);
  return Math.min(100, Math.round(topWeight * 0.78 + breadthBonus));
}
