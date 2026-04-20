import type { MarketId } from "./types";
import { clamp, hashSeed } from "./utils";

export async function getDerivativesMetrics(symbol: string, marketId: MarketId) {
  if (marketId !== "crypto") {
    return {
      funding: 0,
      openInterest: 0,
      derivativesScore: 0,
      available: false,
    };
  }
  const seed = hashSeed(`deriv:${symbol}`);
  const funding = (((seed % 30) - 15) / 1000);
  const openInterest = 50_000_000 + (seed % 9_000_000);
  const derivativesScore = Math.round(clamp(0, 15, 7 + (openInterest / 10_000_000) + (Math.abs(funding) < 0.01 ? 4 : 1)));
  return {
    funding,
    openInterest,
    derivativesScore,
    available: true,
  };
}
