import type { MarketId } from "@/lib/market-data/shared/types";
import type { HealthSnapshot, PublishedSignal } from "./signal-types";
import { getDb } from "@/lib/db";

const SIGNAL_COOLDOWN_MS = 30 * 60 * 1000; // 30-minute per-symbol cooldown

const activeSignals = new Map<string, PublishedSignal>();
const historySignals = new Map<string, PublishedSignal>();
let lastHealthSnapshot: HealthSnapshot | null = null;
let lastEngineRun = 0;

function key(symbol: string, market: MarketId) {
  return `${market}:${symbol}`;
}

export function hasActiveSignal(symbol: string, market: MarketId) {
  // 1. In-memory check (fast path — covers the current process session)
  const current = activeSignals.get(key(symbol, market));
  if (current && ["published", "triggered", "open"].includes(current.lifecycleState)) return true;
  // 2. DB check — catches duplicates across server restarts and the 30-min cooldown window
  const cutoff = new Date(Date.now() - SIGNAL_COOLDOWN_MS).toISOString();
  const row = getDb().prepare(`
    SELECT id FROM signal_records
    WHERE symbol = ? AND market = ?
      AND lifecycle_state IN ('published', 'triggered', 'open')
      AND published_at > ?
    LIMIT 1
  `).get(symbol, market, cutoff) as { id: string } | undefined;
  return Boolean(row);
}

export function upsertSignal(signal: PublishedSignal) {
  activeSignals.set(key(signal.symbol, signal.market), signal);
  historySignals.set(signal.id, signal);
}

export function updateSignal(signal: PublishedSignal) {
  if (["closed_tp", "closed_sl", "closed_timeout", "invalidated_before_entry"].includes(signal.lifecycleState)) {
    activeSignals.delete(key(signal.symbol, signal.market));
  } else {
    activeSignals.set(key(signal.symbol, signal.market), signal);
  }
  historySignals.set(signal.id, signal);
}

export function getPublishedSignals(market?: MarketId) {
  const values = [...historySignals.values()].sort((a, b) => b.timestamp - a.timestamp);
  return market ? values.filter((item) => item.market === market) : values;
}

export function getActiveSignals(market?: MarketId) {
  const values = [...activeSignals.values()].sort((a, b) => b.timestamp - a.timestamp);
  return market ? values.filter((item) => item.market === market) : values;
}

export function getSignalById(id: string) {
  return historySignals.get(id) ?? null;
}

export function setHealthSnapshot(snapshot: HealthSnapshot) {
  lastHealthSnapshot = snapshot;
}

export function getHealthSnapshot() {
  return lastHealthSnapshot;
}

export function setLastEngineRun(timestamp: number) {
  lastEngineRun = timestamp;
}

export function getLastEngineRun() {
  return lastEngineRun;
}

export function clearSignalStore() {
  activeSignals.clear();
  historySignals.clear();
  lastHealthSnapshot = null;
  lastEngineRun = 0;
}

export function replaceSignals(signals: PublishedSignal[]) {
  activeSignals.clear();
  historySignals.clear();
  for (const signal of signals) {
    historySignals.set(signal.id, signal);
    if (!["closed_tp", "closed_sl", "closed_timeout", "invalidated_before_entry"].includes(signal.lifecycleState)) {
      activeSignals.set(key(signal.symbol, signal.market), signal);
    }
  }
}
