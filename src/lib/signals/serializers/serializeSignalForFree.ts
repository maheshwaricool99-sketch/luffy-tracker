import { parseJson } from "@/lib/db";
import { baseListDto, type SignalRecordRow } from "./base";
import type { SignalListItemDto } from "../types/signalDtos";

export function serializeSignalForFree(signal: SignalRecordRow, userContext?: { isWatchlisted?: boolean }): SignalListItemDto {
  const base = baseListDto(signal, true);
  const rationale = parseJson<string[]>(signal.rationale_json, []);
  return {
    ...base,
    rationaleSnippet: rationale[0] ?? base.rationaleSnippet,
    isWatchlisted: Boolean(userContext?.isWatchlisted),
    isPremiumLocked: true,
  };
}
