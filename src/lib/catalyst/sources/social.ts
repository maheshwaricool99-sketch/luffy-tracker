/**
 * CATALYST SIGNALS — SOCIAL MENTIONS ADAPTER
 *
 * ISOLATION GUARANTEE: No imports from trading, execution, or portfolio modules.
 *
 * TODO — production integration options:
 *   - LunarCrush:    GET /api4/public/coins/list/v2?sort=interactions_24h
 *                    API key: process.env.LUNARCRUSH_API_KEY
 *   - Santiment:     GraphQL API for social volume
 *                    API key: process.env.SANTIMENT_API_KEY
 *   - The TIE:       Social sentiment data
 *                    API key: process.env.THE_TIE_API_KEY
 *   - Stocktwits:    GET https://api.stocktwits.com/api/2/trending/symbols.json
 *                    (public, rate limited)
 *   - Reddit:        GET /r/wallstreetbets/hot.json (public)
 *   - Twitter API v2: Recent search endpoint
 *                    API key: process.env.TWITTER_BEARER_TOKEN
 *   - Quiver Quant:  Social sentiment scores
 *                    API key: process.env.QUIVER_QUANT_API_KEY
 */

import type { ProviderStatus, RawSocialMention } from "../types";
import { PROVIDER_TIMEOUT_MS } from "../config";

export interface SocialProvider {
  readonly name: string;
  fetchMentions(symbols?: string[]): Promise<RawSocialMention[]>;
}

function makeStatus(name: string, healthy: boolean, error?: string): ProviderStatus {
  const now = Date.now();
  return {
    name,
    healthy,
    lastSuccessMs: healthy ? now : 0,
    lastErrorMs:   healthy ? 0 : now,
    errorMessage:  error,
  };
}

// ── Stub provider ─────────────────────────────────────────────────────────────

export const stubSocialProvider: SocialProvider = {
  name: "social-stub",

  async fetchMentions(_symbols?: string[]): Promise<RawSocialMention[]> {
    // TODO: Replace with real provider, example for LunarCrush:
    //
    //   const url = new URL("https://lunarcrush.com/api4/public/coins/list/v2");
    //   url.searchParams.set("sort", "interactions_24h");
    //   url.searchParams.set("limit", "100");
    //   const res = await fetch(url.toString(), {
    //     headers: { Authorization: `Bearer ${process.env.LUNARCRUSH_API_KEY}` },
    //     signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    //   });
    //   if (!res.ok) throw new Error(`LunarCrush ${res.status}`);
    //   const data = await res.json();
    //   return (data.data as any[]).map((coin): RawSocialMention => ({
    //     symbol:            coin.symbol.toUpperCase() + "USDT",
    //     mentionsCount:     coin.interactions_24h,
    //     mentionsBaseline:  coin.interactions_24h / (1 + (coin.interactions_24h_change ?? 0) / 100),
    //     sentiment:         (coin.sentiment ?? 3 - 3) / 2,  // normalize 1-5 → -1..1
    //     samplePosts:       coin.types_summary?.map((t: any) => t.example_post),
    //   }));

    return [
      {
        symbol: "AIXI",
        mentionsCount: 18_400,
        mentionsBaseline: 320,
        sentiment: 0.82,
        samplePosts: [
          "AIXI is pivoting to AI, this is the next big thing 🚀",
          "Huge AI partnership announced for $AIXI — watching closely",
        ],
      },
      {
        symbol: "MSTR",
        mentionsCount: 42_000,
        mentionsBaseline: 8_500,
        sentiment: 0.71,
        samplePosts: [
          "MicroStrategy adds more Bitcoin to treasury — BTC reserve strategy paying off",
          "$MSTR is basically a bitcoin ETF at this point",
        ],
      },
      {
        symbol: "SXTP",
        mentionsCount: 9_200,
        mentionsBaseline: 180,
        sentiment: 0.55,
        samplePosts: [
          "WSB found a new play: $SXTP low float + catalyst incoming",
          "Loading up on SXTP — wallstreetbets is onto this one",
        ],
      },
      {
        symbol: "WIFUSDT",
        mentionsCount: 285_000,
        mentionsBaseline: 32_000,
        sentiment: 0.88,
        samplePosts: [
          "dogwifhat going to the moon 🐕🎩",
          "WIF is literally trending on every crypto platform right now",
        ],
      },
      {
        symbol: "INJUSDT",
        mentionsCount: 68_000,
        mentionsBaseline: 18_000,
        sentiment: 0.74,
        samplePosts: [
          "INJ binance listing is confirmed — massive catalyst",
          "Injective ecosystem is exploding right now",
        ],
      },
      {
        symbol: "FETUSDT",
        mentionsCount: 38_000,
        mentionsBaseline: 9_000,
        sentiment: 0.68,
        samplePosts: [
          "FET AI partnership with a major firm is huge for the ecosystem",
          "Fetch.ai is becoming the AI blockchain of choice",
        ],
      },
      {
        symbol: "EIGENUSDT",
        mentionsCount: 52_000,
        mentionsBaseline: 8_000,
        sentiment: 0.79,
        samplePosts: [
          "EigenLayer mainnet launch is a massive ecosystem milestone",
          "EIGEN staking launch — aping in before the crowd",
        ],
      },
    ];
  },
};

// ── Fetcher with circuit-breaker ──────────────────────────────────────────────

export async function fetchSocialMentions(
  provider: SocialProvider = stubSocialProvider,
  symbols?: string[],
): Promise<{ data: RawSocialMention[]; status: ProviderStatus }> {
  let timeoutId: NodeJS.Timeout | null = null;
  try {
    const data = await Promise.race([
      provider.fetchMentions(symbols),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Social provider timeout")), PROVIDER_TIMEOUT_MS);
      }),
    ]);
    if (timeoutId) clearTimeout(timeoutId);
    return { data, status: makeStatus(provider.name, true) };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : "unknown error";
    console.warn(`[CatalystSignals/social] Provider "${provider.name}" failed: ${msg}`);
    return { data: [], status: makeStatus(provider.name, false, msg) };
  }
}
