import type { AggregatedSignalCandidate, SignalFeatureContext } from "./signal-types";

export function getSuppressionReason(candidate: AggregatedSignalCandidate, context: SignalFeatureContext, coverageComplete: boolean) {
  if (context.regime.liquidity === "weak") return "low-liquidity";
  if (context.regime.volatility === "high" && context.structure.score < 12) return "extreme-volatility-without-structure";
  if (!coverageComplete) return "incomplete-scan-coverage";
  if (candidate.expectedR < 1.5) return "poor-expected-r";
  if (candidate.scoreBreakdown.disagreementPenalty >= 18) return "severe-model-disagreement";
  const fallbackAgeLimit = context.market === "crypto" ? 15_000 : 120_000;
  if (context.priceSnapshot.fallback && context.priceSnapshot.ageMs > fallbackAgeLimit) return "stale-fallback-dependency";
  if (candidate.confidence < 70) return "weak-confidence-after-penalties";
  if (Math.abs(context.structure.movePct) > 8) return "late-move";
  return null;
}
