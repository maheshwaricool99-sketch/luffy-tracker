import type { MarketId } from "../shared/types";
import type { SnapshotRecord } from "../core/types";

const snapshots = globalThis.__snapshotCacheStore ?? new Map<string, SnapshotRecord>();

declare global {
  var __snapshotCacheStore: Map<string, SnapshotRecord> | undefined;
}

if (!globalThis.__snapshotCacheStore) globalThis.__snapshotCacheStore = snapshots;

function key(market: MarketId, symbol: string) {
  return `${market}:${symbol}`;
}

export function setSnapshot(record: SnapshotRecord) {
  snapshots.set(key(record.market, record.symbol), record);
}

export function getSnapshotRecord(market: MarketId, symbol: string) {
  const record = snapshots.get(key(market, symbol));
  if (!record) return null;
  return {
    ...record,
    ageMs: Date.now() - record.capturedAtMs,
  };
}

export function getSnapshotAgeForMarket(market: MarketId) {
  const records = [...snapshots.values()].filter((item) => item.market === market);
  if (records.length === 0) return null;
  return Date.now() - Math.max(...records.map((item) => item.capturedAtMs));
}

export function clearSnapshotRecordsForTests() {
  snapshots.clear();
}
