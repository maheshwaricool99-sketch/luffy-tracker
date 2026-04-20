import type { HealthLabel, ProviderHealthState } from "./enums";

export function computeMarketHealthScore(input: {
  providerState: ProviderHealthState;
  dataAgeMs: number | null;
  coveragePct: number;
  recoveryLevel: "none" | "retrying" | "repeated" | "rotating";
  publishable: boolean;
}) {
  let score = 100;

  const statePenalty: Record<ProviderHealthState, number> = {
    live: 0,
    degraded: 10,
    backoff: 20,
    fallback: 25,
    recovering: 15,
    disconnected: 35,
    failed: 50,
  };
  score -= statePenalty[input.providerState];

  const age = input.dataAgeMs ?? Number.POSITIVE_INFINITY;
  if (age <= 5_000) score -= 0;
  else if (age <= 15_000) score -= 5;
  else if (age <= 30_000) score -= 10;
  else if (age <= 60_000) score -= 20;
  else if (age <= 120_000) score -= 35;
  else score -= 50;

  if (input.coveragePct >= 100) score -= 0;
  else if (input.coveragePct >= 80) score -= 5;
  else if (input.coveragePct >= 50) score -= 15;
  else if (input.coveragePct >= 1) score -= 30;
  else score -= 50;

  if (input.recoveryLevel === "retrying") score -= 5;
  if (input.recoveryLevel === "repeated") score -= 10;
  if (input.recoveryLevel === "rotating") score -= 15;
  if (!input.publishable) score -= 25;

  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const label: HealthLabel =
    clamped >= 90 ? "Operational" :
    clamped >= 70 ? "Degraded" :
    clamped >= 40 ? "Partial Outage" :
    "Down";
  return { score: clamped, label };
}
