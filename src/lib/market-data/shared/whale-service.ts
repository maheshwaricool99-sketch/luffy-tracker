import type { MarketId } from "./types";
import { clamp, hashSeed } from "./utils";

export async function getWhaleMetrics(symbol: string, marketId: MarketId) {
  if (marketId !== "crypto") {
    return {
      whaleScore: 0,
      accumulation: 0,
      flowBias: "neutral" as const,
      confidence: 0,
      available: false,
    };
  }
  const seed = hashSeed(`whale:${symbol}`);
  const accumulation = 40 + (seed % 50);
  const flowBias = accumulation > 68 ? "bullish" as const : accumulation < 48 ? "bearish" as const : "neutral" as const;
  const confidence = Math.round(clamp(0, 100, accumulation + 5));
  const whaleScore = Math.round(clamp(0, 15, (accumulation - 35) / 4));
  return {
    whaleScore,
    accumulation,
    flowBias,
    confidence,
    available: true,
  };
}
