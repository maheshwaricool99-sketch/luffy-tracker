import type { SignalStatus } from "../types/signalEnums";

const transitions: Record<SignalStatus, SignalStatus[]> = {
  DETECTED: ["VALIDATED", "REJECTED"],
  VALIDATED: ["PUBLISHED", "REJECTED", "INVALIDATED"],
  PUBLISHED: ["TRIGGERED", "UNPUBLISHED", "INVALIDATED", "EXPIRED"],
  TRIGGERED: ["CLOSED_TP", "CLOSED_SL", "INVALIDATED", "EXPIRED"],
  CLOSED_TP: [],
  CLOSED_SL: [],
  EXPIRED: [],
  INVALIDATED: [],
  REJECTED: [],
  UNPUBLISHED: ["PUBLISHED", "INVALIDATED"],
};

export function canTransitionSignalState(from: SignalStatus, to: SignalStatus) {
  return transitions[from]?.includes(to) ?? false;
}
