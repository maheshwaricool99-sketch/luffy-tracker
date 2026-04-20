/**
 * CATALYST SIGNALS — NEWS / HEADLINES ADAPTER
 *
 * ISOLATION GUARANTEE: No imports from trading, execution, or portfolio modules.
 *
 * TODO — production integration options:
 *   - Benzinga:    GET https://api.benzinga.com/api/v2/news?token=...&topics=movers
 *                  API key: process.env.BENZINGA_API_KEY
 *   - NewsAPI.org: GET https://newsapi.org/v2/everything?q=...&language=en
 *                  API key: process.env.NEWSAPI_KEY
 *   - Polygon.io:  GET /v2/reference/news?ticker=...&apiKey=...
 *                  API key: process.env.POLYGON_API_KEY
 *   - Finnhub:     GET /news?category=general&token=...
 *                  API key: process.env.FINNHUB_API_KEY
 *   - CryptoCompare: GET /data/v2/news/?lang=EN&categories=BTC,ETH
 *                  API key: process.env.CRYPTOCOMPARE_API_KEY
 *   - The Block:   RSS feed scraping (public)
 *   - CoinDesk:    RSS feed: https://feeds.feedburner.com/CoinDesk
 */

import type { ProviderStatus, RawHeadline } from "../types";
import { PROVIDER_TIMEOUT_MS } from "../config";

export interface NewsProvider {
  readonly name: string;
  fetchHeadlines(limit?: number): Promise<RawHeadline[]>;
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

const NOW = Date.now();
const H = 60 * 60_000;

export const stubNewsProvider: NewsProvider = {
  name: "news-stub",

  async fetchHeadlines(_limit = 50): Promise<RawHeadline[]> {
    // TODO: Replace with real provider, example for Benzinga:
    //
    //   const url = new URL("https://api.benzinga.com/api/v2/news");
    //   url.searchParams.set("token", process.env.BENZINGA_API_KEY ?? "");
    //   url.searchParams.set("displayOutput", "full");
    //   url.searchParams.set("pageSize", String(limit));
    //   const res = await fetch(url.toString(), { signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) });
    //   if (!res.ok) throw new Error(`Benzinga news ${res.status}`);
    //   const data = await res.json();
    //   return (data as any[]).map((item): RawHeadline => ({
    //     title:        item.title,
    //     body:         item.body?.slice(0, 500),
    //     source:       "benzinga",
    //     publishedAtMs: new Date(item.created).getTime(),
    //     symbols:      item.stocks?.map((s: any) => s.name) ?? [],
    //     url:          item.url,
    //   }));

    // Headlines attached to PRE-PUMP assets (price hasn't moved yet).
    // These represent the CATALYST — the reason volume is building before the move.
    return [
      // ── Pre-pump catalysts (price still flat, news just published) ────────
      {
        title: "Injective Protocol Announces Cross-Chain AI Integration With Major L2 Networks",
        body:  "Injective Protocol announces a new AI-powered cross-chain bridge partnership with multiple L2 networks, expected to drive significant on-chain activity.",
        source: "coindesk",
        publishedAtMs: NOW - 0.4 * H,
        symbols: ["INJUSDT"],
      },
      {
        title: "EigenLayer Unveils Q2 Ecosystem Grants — $100M Fund to Activate Restaking DeFi",
        body:  "EigenLayer ecosystem grant program begins, with the mainnet launch restaking rewards expected to begin distribution to early stakers within 72 hours.",
        source: "theblock",
        publishedAtMs: NOW - 0.6 * H,
        symbols: ["EIGENUSDT"],
      },
      {
        title: "Sui Network Partners With Major Asian Exchange — Spot Listing Imminent",
        body:  "Sui ecosystem partnership with a tier-1 Asian exchange announced. Spot listing and liquidity pool launch expected within the week.",
        source: "cointelegraph",
        publishedAtMs: NOW - 0.8 * H,
        symbols: ["SUIUSDT"],
      },
      {
        title: "Aptos Foundation Launches $50M Developer Fund and AI Smart Contract Suite",
        body:  "Aptos Foundation ecosystem fund to launch grants for AI-powered smart contracts, with initial product launch scheduled for next quarter.",
        source: "theblock",
        publishedAtMs: NOW - 1.2 * H,
        symbols: ["APTUSDT"],
      },
      {
        title: "Arbitrum DAO Votes to Expand Token Buyback — $ARB Treasury Reserve Program",
        body:  "Arbitrum DAO treasury buyback proposal passes with 72% approval. Token buyback of up to $80M will begin execution next week.",
        source: "decrypt",
        publishedAtMs: NOW - 0.9 * H,
        symbols: ["ARBUSDT"],
      },
      {
        title: "Render Network Secures Partnership With NVIDIA for AI Compute Distribution",
        body:  "Render Network announces ai partnership with NVIDIA to distribute GPU compute through its decentralized network. Product launch in Q3.",
        source: "coindesk",
        publishedAtMs: NOW - 1.5 * H,
        symbols: ["RENDERUSDT"],
      },
      {
        title: "MicroStrategy Plans $2B Bitcoin Treasury Expansion — SEC Filing Confirms",
        body:  "MicroStrategy files with the SEC indicating a planned $2B bitcoin treasury reserve expansion. Bitcoin purchase expected within 30 days.",
        source: "prnewswire",
        publishedAtMs: NOW - 0.5 * H,
        symbols: ["MSTR"],
      },
      {
        title: "Super Micro Computer Awarded $800M AI Data Center Contract — Undisclosed Hyperscaler",
        body:  "Super Micro Computer signs AI infrastructure contract worth $800M with an undisclosed hyperscaler, with delivery expected in 18 months.",
        source: "businesswire",
        publishedAtMs: NOW - 1.0 * H,
        symbols: ["SMCI"],
      },
      {
        title: "SoundHound AI Partners With Three Major Automotive OEMs for Voice AI Integration",
        body:  "SoundHound AI announces strategic partnership with three automotive manufacturers for next-generation in-vehicle AI assistant integration.",
        source: "businesswire",
        publishedAtMs: NOW - 0.7 * H,
        symbols: ["SOUN"],
      },
      {
        title: "Palantir Wins $480M US Army AI Contract Extension — AIP Platform Expansion",
        body:  "Palantir Technologies awarded $480M US Army contract extension for its AI Platform (AIP), with deployment beginning in Q3.",
        source: "bloomberg",
        publishedAtMs: NOW - 1.3 * H,
        symbols: ["PLTR"],
      },
    ];
  },
};

// ── Fetcher with circuit-breaker ──────────────────────────────────────────────

export async function fetchNewsHeadlines(
  provider: NewsProvider = stubNewsProvider,
  limit = 50,
): Promise<{ data: RawHeadline[]; status: ProviderStatus }> {
  let timeoutId: NodeJS.Timeout | null = null;
  try {
    const data = await Promise.race([
      provider.fetchHeadlines(limit),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("News provider timeout")), PROVIDER_TIMEOUT_MS);
      }),
    ]);
    if (timeoutId) clearTimeout(timeoutId);
    return { data, status: makeStatus(provider.name, true) };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : "unknown error";
    console.warn(`[CatalystSignals/news] Provider "${provider.name}" failed: ${msg}`);
    return { data: [], status: makeStatus(provider.name, false, msg) };
  }
}
