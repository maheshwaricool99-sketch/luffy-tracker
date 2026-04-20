export function isPredictionEngineEnabled(): boolean {
  return String(
    process.env.NEXT_PUBLIC_ENABLE_PREDICTION_ENGINE ??
    process.env.ENABLE_PREDICTION_ENGINE ??
    "",
  ).toLowerCase() === "true";
}
