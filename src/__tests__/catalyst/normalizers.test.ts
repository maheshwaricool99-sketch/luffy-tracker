/**
 * Unit tests — Catalyst normalizers
 *
 * Tests that raw provider data is correctly transformed into CatalystCandidates.
 */

import { normalizeStockMover, normalizeCryptoMover } from "@/lib/catalyst/normalizers";
import type { RawHeadline, RawSocialMention } from "@/lib/catalyst/types";

const NOW = Date.now();

describe("normalizeStockMover", () => {
  it("computes relativeVolume correctly", () => {
    const candidate = normalizeStockMover(
      { symbol: "TEST", price: 10, changePct: 20, volume: 5_000_000, avgVolume: 1_000_000 },
      [], [],
    );
    expect(candidate.relativeVolume).toBeCloseTo(5.0, 1);
  });

  it("handles zero avgVolume (default 1×)", () => {
    const candidate = normalizeStockMover(
      { symbol: "TEST", price: 10, changePct: 5, volume: 1_000_000, avgVolume: 0 },
      [], [],
    );
    expect(candidate.relativeVolume).toBe(1);
  });

  it("attaches relevant headlines by symbol", () => {
    const headlines: RawHeadline[] = [
      { title: "TEST announces AI pivot", source: "businesswire", publishedAtMs: NOW, symbols: ["TEST"] },
      { title: "Unrelated news about AAPL", source: "reuters",      publishedAtMs: NOW, symbols: ["AAPL"] },
    ];
    const candidate = normalizeStockMover(
      { symbol: "TEST", price: 10, changePct: 20, volume: 5_000_000, avgVolume: 1_000_000 },
      headlines, [],
    );
    expect(candidate.matchedHeadlines.some((h) => h.title.includes("AI pivot"))).toBe(true);
    expect(candidate.matchedHeadlines.some((h) => h.title.includes("AAPL"))).toBe(false);
  });

  it("computes mentionSpikePct from social data", () => {
    const social: RawSocialMention[] = [{
      symbol: "TEST",
      mentionsCount: 5000,
      mentionsBaseline: 1000,
      sentiment: 0.6,
    }];
    const candidate = normalizeStockMover(
      { symbol: "TEST", price: 10, changePct: 5, volume: 1_000_000, avgVolume: 200_000 },
      [], social,
    );
    expect(candidate.mentionSpikePct).toBeCloseTo(400, 0); // (5000-1000)/1000 * 100 = 400
  });

  it("normalizes sentiment from -1..1 range to 0..100", () => {
    const social: RawSocialMention[] = [{
      symbol: "TEST",
      mentionsCount: 100,
      mentionsBaseline: 100,
      sentiment: 1.0, // max positive
    }];
    const candidate = normalizeStockMover(
      { symbol: "TEST", price: 10, changePct: 5, volume: 1_000_000, avgVolume: 200_000 },
      [], social,
    );
    expect(candidate.sentimentScore).toBe(100);
  });

  it("sets assetType to stock", () => {
    const candidate = normalizeStockMover(
      { symbol: "TEST", price: 10, changePct: 5, volume: 1_000_000, avgVolume: 200_000 },
      [], [],
    );
    expect(candidate.assetType).toBe("stock");
  });

  it("preserves float and name", () => {
    const candidate = normalizeStockMover(
      { symbol: "TEST", name: "Test Corp", price: 10, changePct: 5, volume: 1_000_000, avgVolume: 200_000, float: 5_000_000 },
      [], [],
    );
    expect(candidate.float).toBe(5_000_000);
    expect(candidate.name).toBe("Test Corp");
  });
});

describe("normalizeCryptoMover", () => {
  it("computes relativeVolume correctly", () => {
    const candidate = normalizeCryptoMover(
      { symbol: "BTCUSDT", price: 65000, changePct: 3, volume24h: 70_000_000_000, avgVolume24h: 35_000_000_000 },
      [], [],
    );
    expect(candidate.relativeVolume).toBeCloseTo(2.0, 1);
  });

  it("strips USDT suffix when matching headlines", () => {
    const headlines: RawHeadline[] = [
      { title: "INJ binance listing confirmed", source: "coindesk", publishedAtMs: NOW, symbols: ["INJ"] },
    ];
    const candidate = normalizeCryptoMover(
      { symbol: "INJUSDT", price: 28, changePct: 42, volume24h: 1_200_000_000, avgVolume24h: 280_000_000 },
      headlines, [],
    );
    expect(candidate.matchedHeadlines.some((h) => h.title.includes("binance listing"))).toBe(true);
  });

  it("matches headline keyword content even without symbol tags", () => {
    const headlines: RawHeadline[] = [
      {
        title: "INJUSDT token burn and mainnet launch upcoming",
        source: "coindesk",
        publishedAtMs: NOW,
        symbols: [],
      },
    ];
    const candidate = normalizeCryptoMover(
      { symbol: "INJUSDT", price: 28, changePct: 42, volume24h: 1_200_000_000, avgVolume24h: 280_000_000 },
      headlines, [],
    );
    // Should pick up "mainnet" or "token burn" keywords
    expect(candidate.matchedKeywords.length).toBeGreaterThan(0);
  });

  it("sets assetType to crypto", () => {
    const candidate = normalizeCryptoMover(
      { symbol: "ETHUSDT", price: 3000, changePct: 5, volume24h: 30_000_000_000, avgVolume24h: 20_000_000_000 },
      [], [],
    );
    expect(candidate.assetType).toBe("crypto");
  });
});
