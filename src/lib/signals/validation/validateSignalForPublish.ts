import { parseJson } from "@/lib/db";
import type { SignalRecordRow } from "../serializers/base";

export interface SignalValidationResult {
  ok: boolean;
  issues: Array<{
    code:
      | "MISSING_ENTRY"
      | "MISSING_STOP"
      | "MISSING_TARGET"
      | "STALE_PRICE"
      | "LOW_CONFIDENCE"
      | "MISSING_RATIONALE"
      | "CONFLICTING_SIGNAL"
      | "SOURCE_UNHEALTHY";
    message: string;
    severity: "ERROR" | "WARNING";
  }>;
  flags: {
    hasLivePrice: boolean;
    hasCompleteTradePlan: boolean;
    withinFreshnessWindow: boolean;
    noConflict: boolean;
    sourceHealthy: boolean;
    explanationReady: boolean;
    premiumReady: boolean;
    freeReadyAfterDelay: boolean;
  };
}

export function validateSignalForPublish(signal: SignalRecordRow): SignalValidationResult {
  const issues: SignalValidationResult["issues"] = [];
  if (!signal.entry_value) issues.push({ code: "MISSING_ENTRY", message: "Entry is missing", severity: "ERROR" });
  if (!signal.stop_value) issues.push({ code: "MISSING_STOP", message: "Stop loss is missing", severity: "ERROR" });
  if (!signal.target_value) issues.push({ code: "MISSING_TARGET", message: "TP1 is missing", severity: "ERROR" });
  if (Number(signal.confidence ?? 0) < 70) issues.push({ code: "LOW_CONFIDENCE", message: "Confidence below publish threshold", severity: "WARNING" });
  if (!signal.thesis) issues.push({ code: "MISSING_RATIONALE", message: "Rationale summary missing", severity: "WARNING" });
  if (String(signal.freshness) === "STALE") issues.push({ code: "STALE_PRICE", message: "Signal price is stale", severity: "ERROR" });

  const meta = parseJson<Record<string, unknown>>(signal.meta_json, {});
  const flags = {
    hasLivePrice: String(signal.freshness) === "LIVE",
    hasCompleteTradePlan: Boolean(signal.entry_value && signal.stop_value && signal.target_value),
    withinFreshnessWindow: String(signal.freshness) !== "STALE",
    noConflict: !Boolean(meta.conflictingSignal),
    sourceHealthy: !Boolean(meta.sourceUnhealthy),
    explanationReady: Boolean(signal.thesis),
    premiumReady: Boolean(signal.entry_value && signal.stop_value && signal.target_value),
    freeReadyAfterDelay: String(signal.freshness) !== "UNAVAILABLE",
  };

  if (!flags.noConflict) issues.push({ code: "CONFLICTING_SIGNAL", message: "Conflicting signal detected", severity: "WARNING" });
  if (!flags.sourceHealthy) issues.push({ code: "SOURCE_UNHEALTHY", message: "Source health degraded", severity: "ERROR" });

  return {
    ok: !issues.some((issue) => issue.severity === "ERROR"),
    issues,
    flags,
  };
}
