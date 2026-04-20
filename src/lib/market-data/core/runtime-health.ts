import {
  PROVIDER_HEALTHY_AGE_MS,
  PROVIDER_PUBLICATION_MAX_AGE_MS,
  PROVIDER_STALE_AFTER_MS,
  SCANNER_MIN_USABLE_COVERAGE_PCT,
  SCANNER_SLOW_AFTER_MS,
  SCANNER_STALE_AFTER_MS,
  SNAPSHOT_SIGNAL_TTL_MS,
} from "./constants";
import type { ProviderHealthState, ScanMode } from "./enums";

export type PublicationState = "publishable" | "conservative" | "blocked";
export type ScannerFreshnessState = "LIVE" | "SLOW" | "STALE" | "DEGRADED" | "RECOVERING" | "HALTED";

export type PublicationGateResult = {
  publicationState: PublicationState;
  publicationReasonCodes: string[];
  marketFreshEnough: boolean;
  scannerFreshEnough: boolean;
  coverageHealthyEnough: boolean;
  integrityHealthyEnough: boolean;
  blockingConditions: string[];
};

export function classifyProviderStateFromAge(ageMs: number | null, providerState: ProviderHealthState) {
  if (providerState === "backoff" || providerState === "failed") return providerState;
  if (ageMs === null) return "failed" as const;
  if (ageMs <= PROVIDER_HEALTHY_AGE_MS) return "live" as const;
  if (ageMs <= PROVIDER_STALE_AFTER_MS) return "degraded" as const;
  return "degraded" as const;
}

export function computeScannerFreshnessState(input: {
  scanMode: ScanMode;
  lastSuccessfulCycleAgeMs: number | null;
  recoveryActive: boolean;
  usableCoveragePct: number;
  providerState: ProviderHealthState;
}) : ScannerFreshnessState {
  if (input.scanMode === "halted" || input.providerState === "failed") return "HALTED";
  if (input.recoveryActive) return "RECOVERING";
  if (input.lastSuccessfulCycleAgeMs === null) return "STALE";
  if (input.lastSuccessfulCycleAgeMs <= SCANNER_SLOW_AFTER_MS) return "LIVE";
  if (input.lastSuccessfulCycleAgeMs <= SCANNER_STALE_AFTER_MS) return "SLOW";
  return "STALE";
}

export function evaluatePublicationGate(input: {
  providerState: ProviderHealthState;
  dataAgeMs: number | null;
  scannerFreshnessState: ScannerFreshnessState;
  usableCoveragePct: number;
  blockerReason: string | null;
  snapshotAgeMs: number | null;
  scanMode: ScanMode;
}) : PublicationGateResult {
  const marketFreshEnough = input.dataAgeMs !== null && input.dataAgeMs <= PROVIDER_PUBLICATION_MAX_AGE_MS;
  const scannerFreshEnough = input.scannerFreshnessState === "LIVE" || input.scannerFreshnessState === "SLOW";
  const coverageHealthyEnough = input.usableCoveragePct >= SCANNER_MIN_USABLE_COVERAGE_PCT;
  const integrityHealthyEnough = true;
  const publicationReasonCodes: string[] = [];
  const blockingConditions: string[] = [];
  const protectedFallbackActive =
    input.blockerReason?.includes("protected fallback active") &&
    input.snapshotAgeMs !== null &&
    input.snapshotAgeMs <= SNAPSHOT_SIGNAL_TTL_MS;

  if (!marketFreshEnough) {
    publicationReasonCodes.push("BLOCKED_PRICE_TOO_OLD");
    blockingConditions.push("market-freshness");
  }
  if (!scannerFreshEnough) {
    publicationReasonCodes.push("BLOCKED_STALE_SCANNER");
    blockingConditions.push("scanner-freshness");
  }
  if (!coverageHealthyEnough) {
    publicationReasonCodes.push("BLOCKED_LOW_COVERAGE");
    blockingConditions.push("usable-coverage");
  }
  if (input.providerState === "backoff" || input.providerState === "failed") {
    publicationReasonCodes.push("BLOCKED_PROVIDER_UNHEALTHY");
    blockingConditions.push("provider-health");
  }
  if (input.blockerReason && !input.blockerReason.includes("protected fallback active")) {
    publicationReasonCodes.push("BLOCKED_DEGRADED_INPUT");
    blockingConditions.push("provider-blocker");
  }

  if (
    protectedFallbackActive &&
    input.providerState !== "failed" &&
    scannerFreshEnough &&
    coverageHealthyEnough
  ) {
    return {
      publicationState: "conservative",
      publicationReasonCodes: ["BLOCKED_FALLBACK_PRICE_ONLY", ...publicationReasonCodes.filter((code) => code !== "BLOCKED_DEGRADED_INPUT")],
      marketFreshEnough,
      scannerFreshEnough,
      coverageHealthyEnough,
      integrityHealthyEnough,
      blockingConditions,
    };
  }

  if (blockingConditions.length === 0) {
    return {
      publicationState: "publishable",
      publicationReasonCodes: ["PROVIDER_HEALTHY"],
      marketFreshEnough,
      scannerFreshEnough,
      coverageHealthyEnough,
      integrityHealthyEnough,
      blockingConditions,
    };
  }

  return {
    publicationState: "blocked",
    publicationReasonCodes,
    marketFreshEnough,
    scannerFreshEnough,
    coverageHealthyEnough,
    integrityHealthyEnough,
    blockingConditions,
  };
}
