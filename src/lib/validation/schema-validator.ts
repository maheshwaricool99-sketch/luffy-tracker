import type { AggregatedSignalCandidate, PublishedSignal } from "@/lib/signals/signal-types";

export function validateCandidateSchema(candidate: AggregatedSignalCandidate) {
  return Boolean(
    candidate.symbol &&
    candidate.market &&
    (candidate.direction === "long" || candidate.direction === "short") &&
    Number.isFinite(candidate.finalScore) &&
    Number.isFinite(candidate.confidence) &&
    Number.isFinite(candidate.timestamp),
  );
}

export function validatePublishedSignalSchema(signal: PublishedSignal) {
  return Boolean(
    signal.id &&
    signal.symbol &&
    signal.market &&
    (signal.direction === "long" || signal.direction === "short") &&
    Number.isFinite(signal.confidence) &&
    Number.isFinite(signal.entry) &&
    Number.isFinite(signal.stopLoss) &&
    Number.isFinite(signal.takeProfit) &&
    Number.isFinite(signal.expectedR) &&
    Array.isArray(signal.rationale) &&
    Array.isArray(signal.invalidatesOn),
  );
}
