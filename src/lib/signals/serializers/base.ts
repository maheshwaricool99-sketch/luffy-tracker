import { parseJson } from "@/lib/db";
import { secondsSince } from "@/lib/utils/dates";
import type {
  ConfidenceBucket,
  SignalDirection,
  SignalStatus,
  SignalType,
  SignalVisibility,
} from "@/lib/signals/types/signalEnums";
import type {
  LockedFieldMap,
  SignalDrawerDto,
  SignalFreshnessDto,
  SignalLifecycleStepDto,
  SignalListItemDto,
} from "@/lib/signals/types/signalDtos";

export type SignalRecordRow = Record<string, unknown> & {
  meta_json?: string;
  diagnostics_json?: string;
  rationale_json?: string;
  supporting_factors_json?: string;
  invalidation_rules_json?: string;
};

export function toMarketType(value: string): "CRYPTO" | "US" | "INDIA" {
  if (value === "crypto") return "CRYPTO";
  if (value === "us") return "US";
  return "INDIA";
}

export function toSignalType(row: SignalRecordRow): SignalType {
  const meta = parseJson<Record<string, unknown>>(row.meta_json, {});
  const raw = typeof meta.signalType === "string" ? meta.signalType : String(row.class ?? "");
  if (raw === "BREAKOUT") return "BREAKOUT";
  if (raw === "REVERSAL") return "REVERSAL";
  if (raw === "MOMENTUM") return "MOMENTUM";
  if (raw === "MEAN_REVERSION") return "MEAN_REVERSION";
  if (raw === "VOLATILITY_EXPANSION") return "VOLATILITY_EXPANSION";
  return "TREND_CONTINUATION";
}

export function toSignalStatus(row: SignalRecordRow): SignalStatus {
  const state = String(row.lifecycle_state ?? "PUBLISHED");
  if (state === "closed_tp") return "CLOSED_TP";
  if (state === "closed_sl") return "CLOSED_SL";
  if (state === "expired") return "EXPIRED";
  if (state === "invalidated" || state === "invalidated_before_entry") return "INVALIDATED";
  if (state === "rejected") return "REJECTED";
  if (state === "unpublished") return "UNPUBLISHED";
  if (state === "triggered") return "TRIGGERED";
  return "PUBLISHED";
}

export function toVisibility(row: SignalRecordRow): SignalVisibility {
  const meta = parseJson<Record<string, unknown>>(row.meta_json, {});
  const visibility = typeof meta.visibility === "string" ? meta.visibility : null;
  if (visibility === "ADMIN_ONLY" || visibility === "HIDDEN" || visibility === "FREE_DELAYED" || visibility === "PREMIUM_ONLY") {
    return visibility;
  }
  return String(row.freshness) === "LIVE" ? "PREMIUM_ONLY" : "FREE_DELAYED";
}

export function toConfidenceBucket(score: number): ConfidenceBucket {
  if (score >= 90) return "ELITE";
  if (score >= 80) return "STRONG";
  if (score >= 70) return "GOOD";
  return "WEAK";
}

export function toFreshnessDto(row: SignalRecordRow, delayed: boolean): SignalFreshnessDto {
  const publishedAt = String(row.published_at ?? row.updated_at ?? new Date().toISOString());
  const ageSeconds = secondsSince(publishedAt);
  const badge = ageSeconds < 300 ? "FRESH" : ageSeconds < 900 ? "AGING" : "STALE";
  return { ageSeconds, badge, isDelayed: delayed };
}

export function makeLockedFieldMap(locked: boolean, diagnostics = true, sourceStrategy = true): LockedFieldMap {
  return {
    entry: locked,
    stopLoss: locked,
    targets: locked,
    rationale: locked,
    aiExplanation: locked,
    diagnostics,
    sourceStrategy,
  };
}

export function lifecycleFromRow(row: SignalRecordRow): SignalLifecycleStepDto[] {
  const publishedAt = row.published_at ? String(row.published_at) : null;
  const updatedAt = row.updated_at ? String(row.updated_at) : null;
  const status = toSignalStatus(row);
  return [
    { key: "DETECTED", label: "Detected", at: publishedAt ?? updatedAt, state: "DONE" },
    { key: "VALIDATED", label: "Validated", at: publishedAt ?? updatedAt, state: "DONE" },
    { key: "PUBLISHED", label: "Published", at: publishedAt, state: ["PUBLISHED", "TRIGGERED", "CLOSED_TP", "CLOSED_SL"].includes(status) ? "DONE" : "CURRENT" },
    { key: "TRIGGERED", label: "Triggered", at: null, state: status === "TRIGGERED" ? "CURRENT" : ["CLOSED_TP", "CLOSED_SL"].includes(status) ? "DONE" : "PENDING" },
    { key: "CLOSED", label: "Closed", at: null, state: ["CLOSED_TP", "CLOSED_SL"].includes(status) ? "CURRENT" : "PENDING" },
    { key: "EXPIRED", label: "Expired", at: status === "EXPIRED" ? updatedAt : null, state: status === "EXPIRED" ? "CURRENT" : "PENDING" },
    { key: "INVALIDATED", label: "Invalidated", at: status === "INVALIDATED" ? updatedAt : null, state: status === "INVALIDATED" ? "CURRENT" : "PENDING" },
  ];
}

export function baseListDto(row: SignalRecordRow, delayed: boolean): Omit<SignalListItemDto, "entry" | "stopLoss" | "targets" | "lockedFields" | "isPremiumLocked"> {
  const meta = parseJson<Record<string, unknown>>(row.meta_json, {});
  const currentPrice = Number(row.entry_value ?? 0);
  const sparkline = [
    { t: String(row.published_at ?? row.updated_at), p: Number(row.stop_value ?? currentPrice) },
    { t: String(row.updated_at ?? row.published_at), p: currentPrice },
    { t: String(row.updated_at ?? row.published_at), p: Number(row.target_value ?? currentPrice) },
  ];

  return {
    id: String(row.id),
    publicId: String(meta.publicId ?? row.id),
    symbol: String(row.symbol),
    assetName: typeof meta.assetName === "string" ? meta.assetName : null,
    market: toMarketType(String(row.market)),
    signalType: toSignalType(row),
    direction: String(row.direction) as SignalDirection,
    timeframe: typeof meta.timeframe === "string" ? meta.timeframe : "15m",
    status: toSignalStatus(row),
    confidenceScore: Number(row.confidence),
    confidenceBucket: toConfidenceBucket(Number(row.confidence)),
    currentPrice,
    percentChange: null,
    freshness: toFreshnessDto(row, delayed),
    rationaleSnippet: row.thesis ? String(row.thesis) : null,
    sparkline,
    marketBias: typeof meta.marketBias === "string" ? meta.marketBias as "BULLISH" | "BEARISH" | "NEUTRAL" : null,
    volatilityRegime: typeof meta.volatilityRegime === "string" ? meta.volatilityRegime as "LOW" | "NORMAL" | "HIGH" : null,
    isWatchlisted: false,
  };
}

export function buildDrawerDto(row: SignalRecordRow, listDto: SignalListItemDto, isAdmin: boolean): SignalDrawerDto {
  const rationale = parseJson<string[]>(row.rationale_json, []);
  const supporting = parseJson<string[]>(row.supporting_factors_json, []);
  const invalidation = parseJson<string[]>(row.invalidation_rules_json, []);
  const meta = parseJson<Record<string, unknown>>(row.meta_json, {});

  return {
    ...listDto,
    rationaleFull: rationale.join(" "),
    aiExplanationSimple: supporting[0] ?? null,
    aiExplanationQuant: supporting.join(" · ") || null,
    tradePlan: listDto.isPremiumLocked ? null : {
      entryMin: listDto.entry?.min ?? null,
      entryMax: listDto.entry?.max ?? null,
      stopLoss: listDto.stopLoss?.value ?? null,
      takeProfit1: listDto.targets?.tp1 ?? null,
      takeProfit2: listDto.targets?.tp2 ?? null,
      takeProfit3: listDto.targets?.tp3 ?? null,
      riskRewardRatio: Number(row.expected_r ?? 0),
      invalidationCondition: invalidation[0] ?? null,
    },
    technicals: {
      liquidityScore: typeof meta.liquidityScore === "number" ? meta.liquidityScore : null,
      volumeScore: typeof meta.volumeScore === "number" ? meta.volumeScore : null,
      momentumScore: typeof meta.momentumScore === "number" ? meta.momentumScore : null,
      structureScore: typeof meta.structureScore === "number" ? meta.structureScore : null,
      derivativesScore: typeof meta.derivativesScore === "number" ? meta.derivativesScore : null,
    },
    lifecycle: lifecycleFromRow(row),
    adminDiagnostics: isAdmin ? {
      sourceStrategy: typeof meta.sourceStrategy === "string" ? meta.sourceStrategy : "signal-engine",
      sourceStrategyVersion: typeof meta.sourceStrategyVersion === "string" ? meta.sourceStrategyVersion : null,
      sourceSignalId: typeof meta.sourceSignalId === "string" ? meta.sourceSignalId : null,
      validationFlags: parseJson<Record<string, unknown> | null>(row.diagnostics_json, null),
      diagnostics: meta,
      adminOverride: Boolean(meta.adminOverride),
      adminOverrideReason: typeof meta.adminOverrideReason === "string" ? meta.adminOverrideReason : null,
    } : null,
  };
}
