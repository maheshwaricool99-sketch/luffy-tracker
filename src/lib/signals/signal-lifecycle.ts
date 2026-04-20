import { recordSignalAudit } from "@/lib/audit/signal-audit-log";
import type { LifecycleState, PublishedSignal } from "./signal-types";

const ALLOWED: Record<LifecycleState, LifecycleState[]> = {
  detected: ["validated"],
  validated: ["published"],
  published: ["triggered", "invalidated_before_entry", "closed_timeout"],
  triggered: ["open", "closed_tp", "closed_sl", "closed_timeout"],
  open: ["closed_tp", "closed_sl", "closed_timeout"],
  closed_tp: [],
  closed_sl: [],
  closed_timeout: [],
  invalidated_before_entry: [],
};

export function transitionLifecycle(signal: PublishedSignal, next: LifecycleState, reason: string) {
  if (!ALLOWED[signal.lifecycleState].includes(next)) {
    throw new Error(`illegal lifecycle transition ${signal.lifecycleState} -> ${next}`);
  }
  const updated = { ...signal, lifecycleState: next };
  recordSignalAudit({
    signalId: signal.id,
    symbol: signal.symbol,
    market: signal.market,
    state: next,
    reason,
    timestamp: Date.now(),
  });
  return updated;
}

export function reconcileLifecycle(signal: PublishedSignal, latestPrice: number, now = Date.now()) {
  if (signal.lifecycleState === "published") {
    const triggered =
      signal.direction === "long"
        ? latestPrice >= signal.entry
        : latestPrice <= signal.entry;
    if (triggered) {
      return transitionLifecycle(transitionLifecycle(signal, "triggered", "entry-touched"), "open", "signal-open");
    }
    if (now - signal.timestamp > 6 * 60 * 60_000) {
      return transitionLifecycle(signal, "invalidated_before_entry", "entry-window-expired");
    }
    return signal;
  }
  if (signal.lifecycleState === "open" || signal.lifecycleState === "triggered") {
    if (signal.direction === "long" && latestPrice >= signal.takeProfit) {
      return transitionLifecycle(signal.lifecycleState === "triggered" ? transitionLifecycle(signal, "open", "signal-open") : signal, "closed_tp", "target-reached");
    }
    if (signal.direction === "short" && latestPrice <= signal.takeProfit) {
      return transitionLifecycle(signal.lifecycleState === "triggered" ? transitionLifecycle(signal, "open", "signal-open") : signal, "closed_tp", "target-reached");
    }
    if (signal.direction === "long" && latestPrice <= signal.stopLoss) {
      return transitionLifecycle(signal.lifecycleState === "triggered" ? transitionLifecycle(signal, "open", "signal-open") : signal, "closed_sl", "stop-reached");
    }
    if (signal.direction === "short" && latestPrice >= signal.stopLoss) {
      return transitionLifecycle(signal.lifecycleState === "triggered" ? transitionLifecycle(signal, "open", "signal-open") : signal, "closed_sl", "stop-reached");
    }
    if (now - signal.timestamp > 24 * 60 * 60_000) {
      return transitionLifecycle(signal.lifecycleState === "triggered" ? transitionLifecycle(signal, "open", "signal-open") : signal, "closed_timeout", "signal-timeout");
    }
  }
  return signal;
}
