import { recordIntegrityIssue } from "@/lib/audit/integrity-log";
import type { PublishCheck, AggregatedSignalCandidate, SignalFeatureContext } from "@/lib/signals/signal-types";
import { hasActiveSignal } from "@/lib/signals/signal-store";
import { getSuppressionReason } from "@/lib/signals/suppression-rules";
import { validateFreshness } from "./freshness-validator";
import { isMarketSessionOpen } from "./market-session-validator";
import { validateCandidateSchema } from "./schema-validator";
import { validateTimestampAlignment } from "./timestamp-alignment";

export function runPublishGuard(candidate: AggregatedSignalCandidate | null, context: SignalFeatureContext, coverageComplete: boolean, degraded: boolean): PublishCheck {
  const flags: string[] = [];
  if (!candidate || !validateCandidateSchema(candidate)) {
    return { ok: false, reason: "invalid-candidate-schema", flags, degraded };
  }
  const freshness = validateFreshness(context.priceSnapshot, context.candles);
  if (!freshness.ok) flags.push("stale-data");
  const alignment = validateTimestampAlignment(context.priceSnapshot.tsExchange, context.candles[context.candles.length - 1]?.ts ?? 0);
  if (!alignment.ok) flags.push("timestamp-mismatch");
  const session = isMarketSessionOpen(context.market, candidate.timestamp);
  if (!session.open) flags.push("market-closed");
  if (!coverageComplete) flags.push("incomplete-scan");
  if (degraded) flags.push("degraded-mode");
  if (candidate.finalScore < 70) flags.push("score-below-threshold");
  if (candidate.expectedR < 1.5) flags.push("expected-r-below-threshold");
  if (hasActiveSignal(candidate.symbol, candidate.market)) flags.push("duplicate-active-signal");
  if (Math.abs(context.structure.movePct) >= 5) flags.push("already-moved");
  const suppression = getSuppressionReason(candidate, context, coverageComplete);
  if (suppression) flags.push(suppression);
  if (flags.length > 0) {
    recordIntegrityIssue({
      market: context.market,
      symbol: context.symbol,
      issue: flags.join(","),
      severity: "warn",
      metadata: { finalScore: candidate.finalScore, expectedR: candidate.expectedR },
      timestamp: Date.now(),
    });
  }
  return {
    ok: flags.length === 0,
    reason: flags[0],
    flags,
    degraded,
  };
}
