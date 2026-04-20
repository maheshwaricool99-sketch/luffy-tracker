import type { MarketId } from "@/lib/market-data/shared/types";

export type PredictionScoreInput = {
  marketId: MarketId;
  accumulation: number;
  structure: number;
  volumeAnomaly: number;
  whale: number;
  derivatives: number;
  catalyst: number;
  riskPenalty: number;
};

export function computePredictionScore(input: PredictionScoreInput) {
  const score =
    input.accumulation +
    input.structure +
    input.volumeAnomaly +
    (input.marketId === "crypto" ? input.whale : 0) +
    (input.marketId === "crypto" ? input.derivatives : 0) +
    input.catalyst -
    input.riskPenalty;
  return Math.max(0, Math.min(100, Math.round(score)));
}
