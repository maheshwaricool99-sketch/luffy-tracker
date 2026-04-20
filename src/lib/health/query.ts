import { getDb, nowIso } from "@/lib/db";
import { mapScannerStateToFreshness, mapScannerStateToSourceState } from "@/lib/freshness";
import { getHealthTerminalSnapshot } from "@/lib/signals/signal-engine";

export async function getCustomerHealthSnapshot() {
  const health = await getHealthTerminalSnapshot();
  const db = getDb();
  const now = nowIso();

  const markets = health.sourceHealth.map((market) => {
    const freshness = mapScannerStateToFreshness(market.dataState, market.restoredCount > 0);
    const sourceState = mapScannerStateToSourceState(market.dataState);
    const status =
      freshness === "LIVE"
        ? "LIVE"
        : freshness === "DELAYED"
          ? "DELAYED"
          : freshness === "RESTORED_SNAPSHOT"
            ? "SNAPSHOT"
            : "DEGRADED";

    db.prepare(`
      INSERT INTO market_health (market, status, freshness, source_state, last_updated_at, details_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(market) DO UPDATE SET
        status = excluded.status,
        freshness = excluded.freshness,
        source_state = excluded.source_state,
        last_updated_at = excluded.last_updated_at,
        details_json = excluded.details_json,
        updated_at = excluded.updated_at
    `).run(
      market.market,
      status,
      freshness,
      sourceState,
      market.lastSyncTs ? new Date(market.lastSyncTs).toISOString() : now,
      JSON.stringify({
        coveragePct: market.coveragePct,
        warmupPhase: market.warmupPhase,
        liveCount: market.liveCount,
        cachedCount: market.cachedCount,
        restoredCount: market.restoredCount,
        staleCount: market.staleCount,
        providerStatus: market.providerStatus,
      }),
      now,
      now,
    );

    return {
      market: market.market,
      status,
      freshness,
      sourceState,
      lastUpdatedAt: market.lastSyncTs ? new Date(market.lastSyncTs).toISOString() : null,
      summary:
        freshness === "LIVE"
          ? "Live publishing"
          : freshness === "DELAYED"
            ? "Delayed publishing"
            : freshness === "RESTORED_SNAPSHOT"
              ? "Restored snapshot in effect"
              : "Publishing degraded",
      coveragePct: market.coveragePct,
    };
  });

  return {
    platformStatus: health.degraded ? "DEGRADED" : "LIVE",
    signalPublishing: health.engine.status === "ready" ? "ACTIVE" : "WARMING",
    lastUpdatedAt: health.engine.lastRun ? new Date(health.engine.lastRun).toISOString() : null,
    snapshotRestoreActive: health.snapshotRestoreActive,
    degradedReasons: health.degradedReasons,
    incidentBanner: health.degraded
      ? "Some markets are delayed or running on cache/snapshot protection."
      : null,
    markets,
  };
}
