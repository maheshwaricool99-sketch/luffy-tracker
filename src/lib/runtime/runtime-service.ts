import { cache } from "react";
import { listRuntimeFlagAuditLogs, readRuntimeFlagsSnapshot, updateRuntimeFlag } from "./runtime-store";
import type { RuntimeFlagMutationContext, RuntimeFlags, RuntimeFlagsSnapshot } from "./runtime-types";
import type { RuntimeFlagKey } from "./runtime-keys";

const CACHE_TTL_MS = 5_000;

type RuntimeCacheState = {
  snapshot: RuntimeFlagsSnapshot | null;
  listeners: Set<(snapshot: RuntimeFlagsSnapshot) => void>;
};

const state: RuntimeCacheState = globalThis.__runtimeCacheState ?? {
  snapshot: null,
  listeners: new Set(),
};

declare global {
  var __runtimeCacheState: RuntimeCacheState | undefined;
}

if (!globalThis.__runtimeCacheState) globalThis.__runtimeCacheState = state;

const SAFE_FALLBACK_FLAGS: RuntimeFlags = {
  maintenance_mode: false,
  read_only_mode: false,
  disable_signup: false,
  pause_signal_publishing: true,
  pause_scanners: false,
  freeze_upgrades: true,
  pause_experiments: true,
};

function safeFallbackSnapshot(): RuntimeFlagsSnapshot {
  return {
    flags: { ...SAFE_FALLBACK_FLAGS },
    updatedAt: new Date(0).toISOString(),
    version: 0,
    lastLoadedAt: Date.now(),
  };
}

function shouldRefresh(snapshot: RuntimeFlagsSnapshot | null) {
  if (!snapshot) return true;
  return Date.now() - snapshot.lastLoadedAt > CACHE_TTL_MS;
}

async function loadSnapshot(force = false) {
  if (!force && !shouldRefresh(state.snapshot)) return state.snapshot ?? safeFallbackSnapshot();
  try {
    const next = readRuntimeFlagsSnapshot();
    state.snapshot = next;
    return next;
  } catch (error) {
    console.error("[runtime] failed to load runtime flags", error);
    return state.snapshot ?? safeFallbackSnapshot();
  }
}

const loadSnapshotCached = cache(async () => loadSnapshot(false));

export const runtimeConfig = {
  async getAll(force = false) {
    return force ? loadSnapshot(true) : loadSnapshotCached();
  },
  async get(flag: RuntimeFlagKey) {
    const snapshot = await loadSnapshot();
    return snapshot.flags[flag];
  },
  async set(flag: RuntimeFlagKey, enabled: boolean, context: RuntimeFlagMutationContext) {
    const record = updateRuntimeFlag(flag, enabled, context);
    const snapshot = await loadSnapshot(true);
    for (const listener of state.listeners) listener(snapshot);
    console.info("[runtime] flag updated", { flag, enabled, version: record?.version, actor: context.actorEmail, source: context.source });
    return {
      enabled,
      version: record?.version ?? snapshot.version,
      updatedAt: record?.updatedAt ?? snapshot.updatedAt,
    };
  },
  async refresh() {
    return loadSnapshot(true);
  },
  subscribe(listener: (snapshot: RuntimeFlagsSnapshot) => void) {
    state.listeners.add(listener);
    return () => state.listeners.delete(listener);
  },
  async getAuditLogs(limit = 100) {
    return listRuntimeFlagAuditLogs(limit);
  },
};
