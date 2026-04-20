import type { HealthSnapshot } from "@/lib/signals/signal-types";
import type { ComponentHealth, ComponentStatus } from "./health-types";
import { HEARTBEAT_STALE_MS } from "./health-thresholds";

export function buildComponentList(
  health: HealthSnapshot,
  now: number,
): ComponentHealth[] {
  const components: ComponentHealth[] = [];
  const runtime = health.runtimeFlags;

  // Scanner Engine
  const avgScanAge = health.scanner.length > 0
    ? health.scanner.reduce((sum, m) => sum + (m.lastScanTime ?? 0), 0) / health.scanner.length
    : 0;
  const scannerStatus: ComponentStatus = runtime?.maintenance_mode || runtime?.pause_scanners
    ? "paused"
    : health.degraded
    ? "degraded"
    : avgScanAge > 0 && now - avgScanAge < HEARTBEAT_STALE_MS
    ? "healthy"
    : "degraded";
  const coveragePcts = health.scanner.map((m) => m.coveragePct);
  const avgCoverage = coveragePcts.length > 0
    ? Math.round(coveragePcts.reduce((a, b) => a + b, 0) / coveragePcts.length)
    : 0;
  components.push({
    key: "scanner_engine",
    label: "Scanner Engine",
    status: scannerStatus,
    latencyMs: health.scanner[0]?.scanDurationMs ?? null,
    errorRatePct: null,
    lastHeartbeatMs: avgScanAge > 0 ? avgScanAge : null,
    note: scannerStatus === "paused"
      ? runtime?.maintenance_mode
        ? "Paused by admin maintenance mode"
        : "Paused by admin runtime control"
      : scannerStatus === "degraded"
      ? `Coverage ${avgCoverage}% — scanner may be in warm-up or backoff`
      : `Coverage ${avgCoverage}%`,
  });

  // Signal Engine
  const engineStatus: ComponentStatus =
    runtime?.maintenance_mode || runtime?.pause_signal_publishing
      ? "paused"
      : health.engine.status === "ready"
      ? "healthy"
      : health.engine.status === "warming"
      ? "degraded"
      : "degraded";
  const totalOutputs = Object.values(health.modelLatency ?? {}).reduce((sum, m) => sum + (m.outputCount ?? 0), 0);
  const totalInvalid = Object.values(health.modelLatency ?? {}).reduce((sum, m) => sum + (m.invalidCount ?? 0), 0);
  const errorRate = totalOutputs > 0 ? Math.round((totalInvalid / totalOutputs) * 100) : null;
  components.push({
    key: "signal_engine",
    label: "Signal Engine",
    status: engineStatus,
    latencyMs: null,
    errorRatePct: errorRate,
    lastHeartbeatMs: health.engine.lastRun > 0 ? health.engine.lastRun : null,
    note: runtime?.maintenance_mode
      ? "Publication withheld during maintenance mode"
      : runtime?.pause_signal_publishing
      ? "Publication paused by admin runtime control"
      : health.engine.status === "warming"
      ? "Initializing — building first stable scan snapshot"
      : health.engine.status === "restored"
      ? "Running on restored snapshot"
      : `${health.engine.publishedCount} signals active`,
  });

  // Price Engine
  const liveMarkets = health.sourceHealth.filter((m) => m.dataState === "live" || m.dataState === "delayed");
  const priceEngineStatus: ComponentStatus =
    liveMarkets.length === health.sourceHealth.length
      ? "healthy"
      : liveMarkets.length === 0
      ? "down"
      : "degraded";
  components.push({
    key: "price_engine",
    label: "Price Engine",
    status: priceEngineStatus,
    latencyMs: null,
    errorRatePct: null,
    lastHeartbeatMs: health.sourceHealth.reduce((max, m) => Math.max(max, m.lastSyncTs ?? 0), 0) || null,
    note: priceEngineStatus !== "healthy"
      ? `${liveMarkets.length}/${health.sourceHealth.length} markets live`
      : undefined,
  });

  // WebSocket Feed (infer from provider backoff/availability)
  const wsProviders = health.providers.filter((p) => p.key.includes("feed"));
  const wsHealthy = wsProviders.every((p) => p.status === "healthy");
  const wsBackoff = wsProviders.some((p) => p.backoffActive);
  const wsStatus: ComponentStatus = wsHealthy ? "healthy" : wsBackoff ? "reconnecting" : "degraded";
  components.push({
    key: "ws_feed",
    label: "WebSocket Feed",
    status: wsStatus,
    latencyMs: null,
    errorRatePct: null,
    lastHeartbeatMs: wsProviders.reduce((max, p) => Math.max(max, p.lastSuccessAt ?? 0), 0) || null,
    note: wsBackoff ? "Provider in backoff — REST fallback active" : undefined,
  });

  // REST Aggregator
  const restStatus: ComponentStatus = health.snapshotRestoreActive ? "degraded" : "healthy";
  const totalFallbacks = Object.keys(health.fallbackUsage ?? {}).length;
  components.push({
    key: "rest_aggregator",
    label: "REST Aggregator",
    status: restStatus,
    latencyMs: null,
    errorRatePct: null,
    lastHeartbeatMs: health.engine.lastRun > 0 ? health.engine.lastRun : null,
    note: totalFallbacks > 0 ? `${totalFallbacks} fallback source(s) active` : undefined,
  });

  // Cache Layer
  const snapshotActive = health.snapshotRestoreActive;
  const cacheStatus: ComponentStatus = snapshotActive ? "degraded" : "healthy";
  components.push({
    key: "cache_layer",
    label: "Cache Layer",
    status: cacheStatus,
    latencyMs: null,
    errorRatePct: null,
    lastHeartbeatMs: health.engine.lastRun > 0 ? health.engine.lastRun : null,
    note: snapshotActive ? "Serving restored snapshot data" : undefined,
  });

  // Execution Engine (always disabled by platform design for signal platform)
  components.push({
    key: "execution_engine",
    label: "Execution Engine",
    status: "disabled",
    latencyMs: null,
    errorRatePct: null,
    lastHeartbeatMs: null,
    note: "Disabled by platform design — signal platform only",
  });

  // Incident Monitor
  const incidentMonitorStatus: ComponentStatus =
    health.engine.lastRun > 0 && now - health.engine.lastRun < HEARTBEAT_STALE_MS * 2
      ? "healthy"
      : "degraded";
  components.push({
    key: "incident_monitor",
    label: "Incident Monitor",
    status: incidentMonitorStatus,
    latencyMs: null,
    errorRatePct: null,
    lastHeartbeatMs: health.engine.lastRun > 0 ? health.engine.lastRun : null,
  });

  // Health Aggregator (this very system — if we got here it's running)
  components.push({
    key: "health_aggregator",
    label: "Health Aggregator",
    status: "healthy",
    latencyMs: null,
    errorRatePct: null,
    lastHeartbeatMs: now,
    note: "Live telemetry collection active",
  });

  // Publication Pipeline
  const pubStatus: ComponentStatus =
    runtime?.maintenance_mode || runtime?.pause_signal_publishing
      ? "paused"
      : health.engine.status === "ready"
      ? "healthy"
      : "degraded";
  components.push({
    key: "publication_pipeline",
    label: "Publication Pipeline",
    status: pubStatus,
    latencyMs: null,
    errorRatePct: null,
    lastHeartbeatMs: health.engine.lastRun > 0 ? health.engine.lastRun : null,
    note:
      runtime?.maintenance_mode
        ? "Paused by admin maintenance mode"
        : runtime?.pause_signal_publishing
        ? "Paused by admin runtime control"
        : health.engine.status !== "ready"
        ? `Engine in ${health.engine.status} state`
        : undefined,
  });

  return components;
}
