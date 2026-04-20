import { baseListDto, makeLockedFieldMap, type SignalRecordRow } from "./base";
import type { SignalListItemDto } from "../types/signalDtos";

export function serializeSignalForPremium(signal: SignalRecordRow, userContext?: { isWatchlisted?: boolean }): SignalListItemDto {
  const base = baseListDto(signal, false);
  return {
    ...base,
    entry: {
      min: Number(signal.entry_value ?? 0),
      max: Number(signal.entry_value ?? 0),
    },
    stopLoss: {
      value: Number(signal.stop_value ?? 0),
    },
    targets: {
      tp1: Number(signal.target_value ?? 0),
      tp2: null,
      tp3: null,
    },
    lockedFields: makeLockedFieldMap(false, true, true),
    isWatchlisted: Boolean(userContext?.isWatchlisted),
    isPremiumLocked: false,
  };
}
