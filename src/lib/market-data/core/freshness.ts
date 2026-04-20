import {
  SNAPSHOT_ENTRY_TTL_MS,
  SNAPSHOT_SAFE_DISPLAY_TTL_MS,
  SNAPSHOT_SIGNAL_TTL_MS,
  SNAPSHOT_STRUCTURE_TTL_MS,
} from "./constants";

export function canUseForEntry(ageMs: number) {
  return ageMs <= SNAPSHOT_ENTRY_TTL_MS;
}

export function canUseForSignals(ageMs: number) {
  return ageMs <= SNAPSHOT_SIGNAL_TTL_MS;
}

export function canUseForDisplay(ageMs: number) {
  return ageMs <= SNAPSHOT_SAFE_DISPLAY_TTL_MS;
}

export function canUseForStructure(ageMs: number) {
  return ageMs <= SNAPSHOT_STRUCTURE_TTL_MS;
}
