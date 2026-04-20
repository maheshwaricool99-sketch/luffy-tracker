import type { PublishedSignal } from "@/lib/signals/signal-types";

type SignalAuditEntry = {
  signalId?: string;
  symbol: string;
  market: string;
  state: string;
  reason: string;
  payload?: Record<string, unknown> | PublishedSignal;
  timestamp: number;
};

const signalAuditLog: SignalAuditEntry[] = [];

export function recordSignalAudit(entry: SignalAuditEntry) {
  signalAuditLog.push(entry);
  if (signalAuditLog.length > 2_000) signalAuditLog.shift();
}

export function getSignalAuditLog() {
  return [...signalAuditLog];
}

export function clearSignalAuditLog() {
  signalAuditLog.length = 0;
}
