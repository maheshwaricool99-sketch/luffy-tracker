import { getHealthTerminalSnapshot } from "@/lib/signals/signal-engine";
import { getLuffyLiteSnapshot } from "@/lib/luffy-lite-engine";
import type { HealthSnapshot } from "@/lib/signals/signal-types";
import type {
  HealthResponse,
  HealthStatus,
  HealthSummary,
  HealthTimestamps,
  DataState,
  SignalsState,
  ExecutionState,
} from "./health-types";
import { buildMarketHealthCards } from "./health-markets";
import { buildComponentList } from "./health-components";
import { buildIncidents, buildBanner } from "./health-incidents";
import { buildTradeBlockers } from "./health-blockers";
import { computeReliabilityScore } from "./health-score";
import { buildTrustPayload } from "./health-trust";

function safeUnwrap<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === "fulfilled" ? result.value : null;
}

const BOOTSTRAP_WINDOW_SECONDS = 60;

function isBootstrapping(health: HealthSnapshot): boolean {
  if (health.engine.lastRun > 0) return false;
  if (health.snapshotRestoreActive) return false;
  const uptime = typeof process !== "undefined" && typeof process.uptime === "function" ? process.uptime() : Infinity;
  return uptime < BOOTSTRAP_WINDOW_SECONDS;
}

function computeGlobalStatus(health: HealthSnapshot, now: number): HealthStatus {
  const { sourceHealth, engine } = health;
  const runtime = health.runtimeFlags;

  if (runtime?.maintenance_mode) return "degraded";
  if (runtime?.pause_scanners || runtime?.pause_signal_publishing) return "degraded";

  // Bootstrapping: fresh process, engine has not completed its first run yet.
  // Surface as degraded (not down) so operators can distinguish cold-start from outage.
  if (isBootstrapping(health)) return "degraded";

  // Down: engine not started or all data unavailable
  const allUnavailable = sourceHealth.every((m) => m.dataState === "unavailable");
  if (allUnavailable && engine.publishedCount === 0) return "down";
  if (engine.lastRun === 0 && !health.snapshotRestoreActive) return "down";

  // Partial outage: multiple degraded markets — but only count markets that should be open.
  // Stale data for a closed market (weekend, after-hours) is normal, not an outage.
  const degradedMarkets = sourceHealth.filter((m) =>
    m.open && (m.dataState === "stale" || m.dataState === "unavailable"),
  ).length;
  const unavailableMarkets = sourceHealth.filter((m) =>
    m.open && m.dataState === "unavailable",
  ).length;
  if (unavailableMarkets >= 2) return "partial_outage";
  if (degradedMarkets >= 2) return "partial_outage";
  if (engine.lastRun > 0 && now - engine.lastRun > 600_000) return "partial_outage";

  // Degraded: at least one *open* market not live, or snapshot active, or engine warming
  const anyNotLive = sourceHealth.some((m) =>
    m.open && m.dataState !== "live" && m.dataState !== "delayed",
  );
  if (anyNotLive || health.snapshotRestoreActive || engine.status === "warming") return "degraded";
  if (health.degraded) return "degraded";

  return "operational";
}

function computeDataState(health: HealthSnapshot): DataState {
  // Only consider open markets when classifying data freshness — closed markets
  // always have stale data by design and should not trigger a "Stale" badge.
  const openMarkets = health.sourceHealth.filter((m) => m.open);
  const states = openMarkets.length > 0
    ? openMarkets.map((m) => m.dataState)
    : health.sourceHealth.map((m) => m.dataState);
  if (states.some((s) => s === "stale" || s === "unavailable")) return "stale";
  if (
    states.some((s) => s === "restored_snapshot" || s === "cached") ||
    health.snapshotRestoreActive
  ) return "snapshot";
  return "live";
}

function computeSignalsState(health: HealthSnapshot, now: number): SignalsState {
  if (health.runtimeFlags?.maintenance_mode || health.runtimeFlags?.pause_signal_publishing) return "blocked";
  if (health.runtimeFlags?.pause_scanners) return "delayed";
  if (health.engine.status === "warming" && health.engine.publishedCount === 0) return "blocked";
  const openMarkets = health.sourceHealth.filter((m) => m.open);
  const unavailableOpenMarkets = openMarkets.filter((m) => m.dataState === "unavailable");
  const staleOpenMarkets = openMarkets.filter((m) => m.dataState === "stale");

  // Block only when outage scope is broad enough that safe publication is not
  // possible across the platform. A single affected market should degrade the
  // posture, not imply a total publishing stop for every market.
  if (
    (openMarkets.length > 0 && unavailableOpenMarkets.length === openMarkets.length) ||
    unavailableOpenMarkets.length >= 2
  ) {
    return "blocked";
  }

  if (unavailableOpenMarkets.length > 0 || staleOpenMarkets.length > 0) return "delayed";

  const lastRunAge = health.engine.lastRun > 0 ? now - health.engine.lastRun : Infinity;
  if (lastRunAge > 120_000) return "delayed";
  if (lastRunAge > 30_000) return "delayed";
  return "fresh";
}

function buildCoverageText(health: HealthSnapshot): string {
  if (health.runtimeFlags?.maintenance_mode) return "Maintenance mode active";
  if (health.runtimeFlags?.pause_scanners) return "Scanner coverage paused by admin";
  return health.sourceHealth
    .map((m) => `${m.coveragePct.toFixed(0)}% ${m.market.toUpperCase()}`)
    .join(" · ");
}

function buildStatusTitle(status: HealthStatus): string {
  switch (status) {
    case "operational": return "Operational";
    case "degraded": return "Degraded";
    case "partial_outage": return "Partial Outage";
    case "down": return "Down";
  }
}

function buildRuntimeStatusTitle(health: HealthSnapshot): string | null {
  if (health.runtimeFlags?.maintenance_mode) return "Maintenance Mode";
  if (health.runtimeFlags?.pause_scanners && health.runtimeFlags?.pause_signal_publishing) return "Admin Pause Active";
  if (health.runtimeFlags?.pause_scanners) return "Scanners Paused";
  if (health.runtimeFlags?.pause_signal_publishing) return "Publishing Paused";
  return null;
}

function buildStatusMessage(status: HealthStatus, health: HealthSnapshot): string {
  const runtime = health.runtimeFlags;
  if (runtime?.maintenance_mode) {
    return "The platform is in maintenance mode. Admin access and diagnostics remain available, while public mutations, upgrades, and signal publication are intentionally restricted.";
  }
  if (runtime?.pause_scanners && runtime?.pause_signal_publishing) {
    return "Scanner loops and the publication pipeline are intentionally paused by runtime control. Health telemetry remains available so operators can verify state without treating the platform as failed.";
  }
  if (runtime?.pause_scanners) {
    return "Scanner loops are intentionally paused by runtime control. Existing telemetry remains visible, but new scan coverage will not advance until scanners are resumed.";
  }
  if (runtime?.pause_signal_publishing) {
    return "Signal publication is intentionally paused by runtime control. Analysis may continue internally, but new signals are withheld rather than published.";
  }
  switch (status) {
    case "operational":
      return "All major services are live. Market data is fresh, scan coverage is healthy, and signal generation is operating normally.";
    case "degraded":
      return "Some live data providers are delayed or in fallback mode. Signals remain usable, but timing-sensitive entries may be slightly delayed.";
    case "partial_outage":
      return `One or more critical systems are impaired. ${health.degradedReasons.slice(0, 2).join("; ") || "Signal freshness or market coverage is affected"}, and some actions may be temporarily unavailable.`;
    case "down":
      return "Core platform services are currently unavailable. Live market monitoring and signal publication are paused until recovery completes.";
  }
}

function buildTimestamps(health: HealthSnapshot, now: number): HealthTimestamps {
  const lastRecovery = health.providers.reduce(
    (max, p) => Math.max(max, p.lastSuccessAt ?? 0),
    0,
  );
  const lastIncident = health.providers.reduce(
    (max, p) => Math.max(max, p.lastFailureAt ?? 0),
    0,
  );
  const lastScan = health.scanner.reduce(
    (max, s) => Math.max(max, s.lastScanTime ?? 0),
    0,
  );

  return {
    now,
    lastSystemUpdate: health.engine.lastRun > 0 ? health.engine.lastRun : null,
    lastScan: lastScan > 0 ? lastScan : null,
    lastSignal: health.engine.lastRun > 0 && health.engine.publishedCount > 0
      ? health.engine.lastRun
      : null,
    lastIncidentChange: lastIncident > 0 ? lastIncident : null,
    lastRecoveryAttempt: lastRecovery > 0 ? lastRecovery : null,
  };
}

function makeFallbackHealth(): HealthSnapshot {
  return {
    degraded: true,
    degradedReasons: ["health-aggregator-cold-start"],
    snapshotRestoreActive: false,
    engine: {
      status: "warming",
      inFlight: false,
      lastRun: 0,
      publishedCount: 0,
      restoredSignals: 0,
    },
    sourceHealth: [],
    scanner: [],
    providers: [],
    modelLatency: {} as never,
    validationFailures: {},
    fallbackUsage: {},
    skipReasons: {},
  };
}

export async function getHealthSnapshot(): Promise<HealthResponse> {
  const now = Date.now();

  const [healthResult, luffyResult] = await Promise.allSettled([
    getHealthTerminalSnapshot(),
    getLuffyLiteSnapshot(),
  ]);

  const health = safeUnwrap(healthResult) ?? makeFallbackHealth();
  const luffy = safeUnwrap(luffyResult);

  const status = computeGlobalStatus(health, now);
  const dataState = computeDataState(health);
  const signalsState = computeSignalsState(health, now);
  const executionState: ExecutionState = "disabled"; // Signal platform by design

  const bootstrapping = isBootstrapping(health);
  const recovering =
    !bootstrapping &&
    (health.snapshotRestoreActive ||
      health.engine.status === "warming" ||
      health.providers.some((p) => p.backoffActive));
  const summary: HealthSummary = {
    title: buildRuntimeStatusTitle(health) ?? (bootstrapping ? "Bootstrapping" : buildStatusTitle(status)),
    message: bootstrapping
      ? "The signal engine is starting up. Market data connections are being established and the first scan cycle has not completed yet."
      : buildStatusMessage(status, health),
    bootstrapping,
    recovering,
    dataState,
    signalsState,
    executionState,
    coverageText: buildCoverageText(health),
  };

  const timestamps = buildTimestamps(health, now);
  const markets = buildMarketHealthCards(health, now);
  const reliability = computeReliabilityScore(health, now, luffy);
  const components = buildComponentList(health, now);
  const incidents = buildIncidents(health, now);
  const blockers = buildTradeBlockers(health, now, luffy);
  const banner = buildBanner(status, incidents, markets, health);
  const trust = buildTrustPayload(health, { markets, reliability, incidents }, now);
  if (reliability.metrics) {
    reliability.metrics.incidentPenalty = trust.incidentSummary.weightedActiveCount;
  }

  return {
    status,
    summary,
    timestamps,
    banner,
    markets,
    reliability,
    components,
    blockers,
    incidents,
    trust,
  };
}
