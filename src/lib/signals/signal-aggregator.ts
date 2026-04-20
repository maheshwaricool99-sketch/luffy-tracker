import { recordDecision } from "@/lib/audit/decision-log";
import { average, clamp } from "@/lib/market-data/shared/utils";
import type { AggregatedSignalCandidate, ModelOutput, SignalFeatureContext, SourceModel } from "./signal-types";

const MODEL_WEIGHTS: Record<SourceModel, number> = {
  continuation_model: 0.25,
  breakout_model: 0.2,
  reversal_model: 0.15,
  high_confidence_filter: 0.25,
  early_detection_filter: 0.15,
};

export function aggregateModelOutputs(outputs: ModelOutput[], context: SignalFeatureContext): AggregatedSignalCandidate | null {
  const directional = outputs.filter((item) => item.direction !== "none");
  const longModels = directional.filter((item) => item.direction === "long");
  const shortModels = directional.filter((item) => item.direction === "short");
  const longWeight = longModels.reduce((sum, item) => sum + MODEL_WEIGHTS[item.meta?.sourceModel ?? "continuation_model"] * item.confidence, 0);
  const shortWeight = shortModels.reduce((sum, item) => sum + MODEL_WEIGHTS[item.meta?.sourceModel ?? "continuation_model"] * item.confidence, 0);
  const conflictModels = longModels.length > 0 && shortModels.length > 0;
  const severeDisagreement = conflictModels && Math.abs(longWeight - shortWeight) < 8;
  if (severeDisagreement) {
    recordDecision({
      symbol: context.symbol,
      market: context.market,
      stage: "aggregation",
      reason: "equal-direction-split",
      timestamp: Date.now(),
    });
    return null;
  }
  const chosenDirection = longWeight > shortWeight ? "long" : "short";
  const agreeing = directional.filter((item) => item.direction === chosenDirection);
  if (agreeing.length < 2) return null;

  const disagreementPenalty = clamp(0, 25, conflictModels ? Math.min(longWeight, shortWeight) / 4 : 0);
  const totalAgreeingWeight = agreeing.reduce((sum, item) => sum + MODEL_WEIGHTS[item.meta?.sourceModel ?? "continuation_model"], 0) || 1;
  const weightedStrength = agreeing.reduce((sum, item) => sum + item.strength * MODEL_WEIGHTS[item.meta?.sourceModel ?? "continuation_model"], 0) / totalAgreeingWeight;
  const weightedConfidence = agreeing.reduce((sum, item) => sum + item.confidence * MODEL_WEIGHTS[item.meta?.sourceModel ?? "continuation_model"], 0) / totalAgreeingWeight;
  const scoreBreakdown = {
    structure: Math.round(average(agreeing.map((item) => item.features.structure ?? 0))),
    momentum: Math.round(average(agreeing.map((item) => item.features.momentum ?? 0))),
    volume: Math.round(average(agreeing.map((item) => item.features.volume ?? 0))),
    volatility: Math.round(average(agreeing.map((item) => item.features.volatility ?? 0))),
    trend: Math.round(average(agreeing.map((item) => item.features.trend ?? 0))),
    derivatives: Math.round(average(agreeing.map((item) => item.features.derivatives ?? 0))),
    rr: Math.round(clamp(0, 100, context.expectedR * 40)),
    disagreementPenalty: Number(disagreementPenalty.toFixed(2)),
  };
  const finalScore = clamp(
    0,
    100,
    (weightedStrength * 0.45) +
      (weightedConfidence * 0.35) +
      (scoreBreakdown.rr * 0.2) -
      disagreementPenalty,
  );
  const confidence = clamp(0, 100, (weightedConfidence * 0.8) + (scoreBreakdown.structure * 0.1) + (scoreBreakdown.volume * 0.1) - disagreementPenalty);
  return {
    symbol: context.symbol,
    market: context.market,
    direction: chosenDirection,
    finalScore: Number(finalScore.toFixed(2)),
    confidence: Number(confidence.toFixed(2)),
    timestamp: context.priceSnapshot.tsReceived,
    contributors: Object.fromEntries(
      agreeing.map((item) => [item.meta?.sourceModel ?? "continuation_model", Number(item.confidence.toFixed(2))]),
    ),
    scoreBreakdown,
    rationaleInputs: context.rationaleInputs,
    validationFlags: [],
    expectedR: context.expectedR,
    dataQuality: agreeing.some((item) => item.meta?.dataQuality === "misaligned")
      ? "misaligned"
      : agreeing.some((item) => item.meta?.dataQuality === "stale")
        ? "stale"
        : "healthy",
  };
}
