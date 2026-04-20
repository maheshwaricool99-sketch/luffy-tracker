import { parseJson } from "@/lib/db";
import { baseListDto, makeLockedFieldMap, type SignalRecordRow } from "./base";
import type { AdminSignalListItemDto } from "../types/signalDtos";
import { toVisibility } from "./base";

export function serializeSignalForAdmin(signal: SignalRecordRow): AdminSignalListItemDto {
  const base = baseListDto(signal, false);
  const meta = parseJson<Record<string, unknown>>(signal.meta_json, {});
  return {
    ...base,
    entry: { min: Number(signal.entry_value ?? 0), max: Number(signal.entry_value ?? 0) },
    stopLoss: { value: Number(signal.stop_value ?? 0) },
    targets: { tp1: Number(signal.target_value ?? 0), tp2: null, tp3: null },
    lockedFields: makeLockedFieldMap(false, false, false),
    isPremiumLocked: false,
    visibility: toVisibility(signal),
    sourceStrategy: typeof meta.sourceStrategy === "string" ? meta.sourceStrategy : "signal-engine",
    sourceStrategyVersion: typeof meta.sourceStrategyVersion === "string" ? meta.sourceStrategyVersion : null,
    invalidReason: typeof meta.invalidReason === "string" ? meta.invalidReason : null,
    moderationState: {
      published: String(signal.lifecycle_state ?? "") === "published",
      unpublished: String(signal.lifecycle_state ?? "") === "unpublished",
      invalidated: String(signal.lifecycle_state ?? "") === "invalidated",
      rejected: String(signal.lifecycle_state ?? "") === "rejected",
      adminOverride: Boolean(meta.adminOverride),
    },
  };
}
