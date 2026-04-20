import type { AggregatedSignalCandidate, SignalFeatureContext } from "./signal-types";

export function buildRationale(candidate: AggregatedSignalCandidate, context: SignalFeatureContext) {
  const lines = [
    `${candidate.direction === "long" ? "Bullish" : "Bearish"} agreement formed between breakout and continuation structure inputs.`,
    `Volume is running at ${context.volume.ratio.toFixed(2)}x baseline while regime trend is ${context.regime.trend}.`,
    `Data quality is ${candidate.dataQuality} with ${context.priceSnapshot.source}${context.priceSnapshot.fallback ? ` fallback from ${context.priceSnapshot.fallback}` : ""}.`,
  ];
  if (candidate.scoreBreakdown.disagreementPenalty > 0) {
    lines.push(`Confidence was reduced by cross-model disagreement penalty of ${candidate.scoreBreakdown.disagreementPenalty.toFixed(1)}.`);
  }
  return lines;
}

export function buildInvalidationRules(context: SignalFeatureContext, direction: "long" | "short") {
  return [
    direction === "long"
      ? `Invalidates if price loses ${context.stopLoss.toFixed(4)} support.`
      : `Invalidates if price reclaims ${context.stopLoss.toFixed(4)} resistance.`,
    `Invalidates if price freshness exceeds 5 seconds or candle alignment drifts.`,
    `Invalidates if volatility regime shifts to high without structure confirmation.`,
  ];
}
