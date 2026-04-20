import { recordModelOutput } from "@/lib/audit/model-output-log";
import { clamp } from "@/lib/market-data/shared/utils";
import type { ModelOutput } from "@/lib/signals/signal-types";

export function normalizeModelOutput(output: ModelOutput): ModelOutput | null {
  const validDirection = output.direction === "long" || output.direction === "short" || output.direction === "none";
  const validTimestamp = Number.isFinite(output.timestamp) && output.timestamp > 0;
  if (!validDirection || !validTimestamp) {
    recordModelOutput({
      symbol: output.symbol,
      market: output.market,
      model: output.meta?.sourceModel ?? "continuation_model",
      output: null,
      accepted: false,
      reason: "invalid-shape",
      timestamp: Date.now(),
    });
    return null;
  }
  const normalized: ModelOutput = {
    ...output,
    strength: clamp(0, 100, output.strength),
    confidence: clamp(0, 100, output.confidence),
    features: {
      structure: output.features.structure == null ? undefined : clamp(0, 100, output.features.structure),
      momentum: output.features.momentum == null ? undefined : clamp(0, 100, output.features.momentum),
      volume: output.features.volume == null ? undefined : clamp(0, 100, output.features.volume),
      volatility: output.features.volatility == null ? undefined : clamp(0, 100, output.features.volatility),
      trend: output.features.trend == null ? undefined : clamp(0, 100, output.features.trend),
      derivatives: output.features.derivatives == null ? undefined : clamp(0, 100, output.features.derivatives),
    },
  };
  recordModelOutput({
    symbol: normalized.symbol,
    market: normalized.market,
    model: normalized.meta?.sourceModel ?? "continuation_model",
    output: normalized,
    accepted: true,
    timestamp: Date.now(),
  });
  return normalized;
}
