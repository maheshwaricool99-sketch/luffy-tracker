import { baseListDto, type SignalRecordRow } from "./base";
import type { SignalListItemDto } from "../types/signalDtos";

export function serializeSignalForGuest(signal: SignalRecordRow): SignalListItemDto {
  const base = baseListDto(signal, true);
  return {
    ...base,
    isPremiumLocked: true,
  };
}
