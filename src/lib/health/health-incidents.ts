import type { HealthSnapshot } from "@/lib/signals/signal-types";
import type { Incident, HealthBanner, HealthStatus, IncidentSeverity, MarketHealthCard } from "./health-types";

let incidentIdCounter = 0;
function makeId() { return `inc_${Date.now()}_${++incidentIdCounter}`; }

export function buildIncidents(health: HealthSnapshot, now: number): Incident[] {
  const incidents: Incident[] = [];
  const runtime = health.runtimeFlags;

  if (runtime?.maintenance_mode) {
    incidents.push({
      id: makeId(),
      ts: now,
      severity: "warning",
      severityV2: "MAJOR",
      title: "Maintenance Mode Enabled",
      summary: "The platform is intentionally restricted by runtime control.",
      impact: "Public access and write paths may be blocked while maintenance work is active.",
      status: "active",
      statusV2: "ACTIVE",
      category: "signal_blocking",
      affectedMarkets: ["crypto", "us", "india"],
      firstDetectedAt: now,
      lastUpdatedAt: now,
      cause: "Admin enabled maintenance mode",
      userImpact: "New writes, upgrades, and publications are intentionally withheld.",
      mitigation: "Admin access and diagnostics remain available.",
      confidenceImpact: 12,
    });
  }

  if (runtime?.pause_scanners) {
    incidents.push({
      id: makeId(),
      ts: now,
      severity: "info",
      severityV2: "WARNING",
      title: "Scanners Paused By Admin",
      summary: "Scanner loops are intentionally paused by runtime control.",
      impact: "Coverage will stop advancing until scanners are resumed.",
      status: "active",
      statusV2: "ACTIVE",
      category: "stale_scanner",
      affectedMarkets: ["crypto", "us", "india"],
      firstDetectedAt: now,
      lastUpdatedAt: now,
      cause: "Admin enabled pause_scanners",
      userImpact: "Stale scans are intentional rather than caused by provider failure.",
      mitigation: "Resume scanners from runtime controls when safe.",
      confidenceImpact: 8,
    });
  }

  if (runtime?.pause_signal_publishing) {
    incidents.push({
      id: makeId(),
      ts: now,
      severity: "info",
      severityV2: "WARNING",
      title: "Signal Publishing Paused By Admin",
      summary: "The publication pipeline is intentionally paused by runtime control.",
      impact: "New signals may be evaluated internally but will not be released.",
      status: "active",
      statusV2: "ACTIVE",
      category: "signal_blocking",
      affectedMarkets: ["crypto", "us", "india"],
      firstDetectedAt: now,
      lastUpdatedAt: now,
      cause: "Admin enabled pause_signal_publishing",
      userImpact: "Existing signals remain visible, but new publication is withheld.",
      mitigation: "Resume publication once integrity or incident checks are complete.",
      confidenceImpact: 6,
    });
  }

  // Engine state incidents
  if (health.engine.status === "warming") {
    incidents.push({
      id: makeId(),
      ts: health.engine.lastRun > 0 ? health.engine.lastRun : now,
      severity: "info",
      severityV2: "INFO",
      title: "Signal Engine Initializing",
      summary: "The signal engine is performing its initial warm-up scan.",
      impact: "No signals until the first full scan cycle completes.",
      status: "active",
      statusV2: "ACTIVE",
      category: "stale_scanner",
      affectedMarkets: ["crypto", "us", "india"],
      firstDetectedAt: health.engine.lastRun > 0 ? health.engine.lastRun : now,
      lastUpdatedAt: health.engine.lastRun > 0 ? health.engine.lastRun : now,
      cause: "Signal engine warm-up",
      userImpact: "New signals remain withheld until first stable cycle completes.",
      mitigation: "Warm-up and priority scanning are active.",
      confidenceImpact: 10,
    });
  }

  if (health.snapshotRestoreActive) {
    incidents.push({
      id: makeId(),
      ts: now,
      severity: "warning",
      severityV2: "WARNING",
      title: "Snapshot Restore Active",
      summary: "One or more markets are running on restored snapshot data.",
      impact: "Entry timing may lag. Structure analysis remains valid.",
      status: "active",
      statusV2: "ACTIVE",
      category: "fallback_usage",
      affectedMarkets: ["crypto", "us", "india"],
      firstDetectedAt: now,
      lastUpdatedAt: now,
      cause: "Recovered from persisted snapshot state",
      userImpact: "Timing-sensitive signals are downgraded or blocked.",
      mitigation: "Automatic live recovery is active.",
      confidenceImpact: 18,
    });
  }

  // Provider incidents
  for (const provider of health.providers) {
    if (provider.backoffActive) {
      incidents.push({
        id: makeId(),
        ts: provider.lastFailureAt ?? now,
        severity: "warning",
        severityV2: "WARNING",
        title: `${provider.label ?? provider.key} Provider Backoff`,
        summary: `Provider entered backoff after ${provider.consecutiveFailures} consecutive failures.`,
        impact: "Fallback or cached data used for this market. Signal freshness may be reduced.",
        status: provider.cooldownUntil && provider.cooldownUntil > now ? "active" : "monitoring",
        statusV2: provider.cooldownUntil && provider.cooldownUntil > now ? "ACTIVE" : "RECOVERING",
        category: "provider_outage",
        affectedMarkets: [provider.market],
        firstDetectedAt: provider.lastFailureAt ?? now,
        lastUpdatedAt: provider.lastFailureAt ?? now,
        cause: provider.lastError ?? "Repeated provider failure",
        userImpact: "Price freshness or coverage may degrade for part of the market.",
        mitigation: "Provider backoff and rotation are active.",
        confidenceImpact: 16,
      });
    } else if (provider.status === "unavailable") {
      incidents.push({
        id: makeId(),
        ts: provider.lastFailureAt ?? now,
        severity: "critical",
        severityV2: "CRITICAL",
        title: `${provider.label ?? provider.key} Provider Unavailable`,
        summary: "Primary data provider is not responding.",
        impact: "Market data may be unavailable or running on stale cache.",
        status: "active",
        statusV2: "ACTIVE",
        category: "provider_outage",
        affectedMarkets: [provider.market],
        firstDetectedAt: provider.lastFailureAt ?? now,
        lastUpdatedAt: provider.lastFailureAt ?? now,
        cause: provider.lastError ?? "Provider unavailable",
        userImpact: "Signals for the affected market may be delayed or blocked.",
        mitigation: "Failover and recovery are in progress.",
        confidenceImpact: 28,
      });
    } else if (provider.status === "degraded" && provider.successRate < 0.7) {
      incidents.push({
        id: makeId(),
        ts: provider.lastFailureAt ?? now,
        severity: "info",
        severityV2: "INFO",
        title: `${provider.label ?? provider.key} Degraded`,
        summary: `Success rate at ${Math.round(provider.successRate * 100)}%. System is monitoring for recovery.`,
        impact: "Some symbols may fetch slower or fall back to cached data.",
        status: "monitoring",
        statusV2: "RECOVERING",
        category: "latency_spike",
        affectedMarkets: [provider.market],
        firstDetectedAt: provider.lastFailureAt ?? now,
        lastUpdatedAt: provider.lastFailureAt ?? now,
        cause: provider.lastError ?? "Provider success rate degraded",
        userImpact: "Coverage may narrow temporarily.",
        mitigation: "Provider scoring and failover are active.",
        confidenceImpact: 8,
      });
    }
  }

  // Market degradation incidents — use scanner snapshot for degradedReasons
  for (const market of health.sourceHealth) {
    const scannerSnapshot = health.scanner.find((s) => s.market === market.market);
    const reasons = scannerSnapshot?.degradedReasons ?? [];
    if (reasons.length > 0) {
      incidents.push({
        id: makeId(),
        ts: market.lastSyncTs ?? now,
        severity: "warning",
        severityV2: "MAJOR",
        title: `${market.market.toUpperCase()} Market Degraded`,
        summary: reasons.join("; "),
        impact: "Reduced freshness or coverage for this market.",
        status: "active",
        statusV2: "ACTIVE",
        category: "stale_scanner",
        affectedMarkets: [market.market],
        affectedSymbolsCount: scannerSnapshot?.skippedCount ?? 0,
        firstDetectedAt: market.lastSyncTs ?? now,
        lastUpdatedAt: market.lastSyncTs ?? now,
        cause: reasons.join("; "),
        userImpact: "Affected signals are downgraded or blocked rather than published with weak confidence.",
        mitigation: "Auto-restart, provider rotation, and reduced-universe scanning remain active.",
        confidenceImpact: 20,
      });
    } else if (market.fallbackActive && market.dataState !== "live") {
      incidents.push({
        id: makeId(),
        ts: market.lastSyncTs ?? now,
        severity: "info",
        severityV2: "WARNING",
        title: `${market.market.toUpperCase()} Fallback Active`,
        summary: `Primary data source is unavailable. Fallback source is active for ${market.market.toUpperCase()}.`,
        impact: "Data may reflect slight delay compared to primary feed.",
        status: "monitoring",
        statusV2: "RECOVERING",
        category: "fallback_usage",
        affectedMarkets: [market.market],
        affectedSymbolsCount: scannerSnapshot?.cachedCount ?? 0,
        firstDetectedAt: market.lastSyncTs ?? now,
        lastUpdatedAt: market.lastSyncTs ?? now,
        cause: "Primary feed unavailable for subset of symbols",
        userImpact: "Execution-grade signals are downgraded when fallback exceeds freshness threshold.",
        mitigation: "Fallback is bounded and live recovery is in progress.",
        confidenceImpact: 12,
      });
    }
    if (market.dataState === "unavailable") {
      incidents.push({
        id: makeId(),
        ts: market.lastSyncTs ?? now,
        severity: "critical",
        severityV2: "CRITICAL",
        title: `${market.market.toUpperCase()} Data Unavailable`,
        summary: "No usable market data is available for this market.",
        impact: "Signals for this market are blocked until data is restored.",
        status: "active",
        statusV2: "ACTIVE",
        category: "data_freshness",
        affectedMarkets: [market.market],
        affectedSymbolsCount: scannerSnapshot?.totalSymbols ?? 0,
        firstDetectedAt: market.lastSyncTs ?? now,
        lastUpdatedAt: market.lastSyncTs ?? now,
        cause: "No usable live or bounded fallback data remains",
        userImpact: "Market-wide signal publication is paused.",
        mitigation: "Provider failover and recovery keep retrying.",
        confidenceImpact: 35,
      });
    }
  }

  // Validation failures
  const totalFailures = Object.values(health.validationFailures ?? {}).reduce((a, b) => a + b, 0);
  if (totalFailures > 10) {
    incidents.push({
      id: makeId(),
      ts: health.engine.lastRun > 0 ? health.engine.lastRun : now,
      severity: "info",
      severityV2: "INFO",
      title: "Elevated Validation Failures",
      summary: `${totalFailures} signals rejected by publish guard this session.`,
      impact: "Signal quality filtering is active and working as intended.",
      status: "monitoring",
      statusV2: "MITIGATED",
      category: "signal_blocking",
      affectedMarkets: ["crypto", "us", "india"],
      firstDetectedAt: health.engine.lastRun > 0 ? health.engine.lastRun : now,
      lastUpdatedAt: health.engine.lastRun > 0 ? health.engine.lastRun : now,
      cause: "Publish guard rejected low-quality or degraded candidates",
      userImpact: "Unsafe signals are withheld rather than published.",
      mitigation: "Trust filters remain active.",
      confidenceImpact: 6,
    });
  }

  return incidents.sort((a, b) => b.ts - a.ts);
}

export function buildBanner(
  status: HealthStatus,
  incidents: Incident[],
  markets: { crypto: MarketHealthCard; us: MarketHealthCard; india: MarketHealthCard },
  health: HealthSnapshot,
): HealthBanner | undefined {
  const activeIncidents = incidents.filter((i) => i.status === "active");
  if (status === "operational" && activeIncidents.length === 0) return undefined;

  const severity: IncidentSeverity =
    status === "down" ? "critical" :
    status === "partial_outage" ? "critical" :
    status === "degraded" ? "warning" : "info";

  const whatHappened: string[] = [];
  const impact: string[] = [];
  const recovery: string[] = [];

  // Collect what happened — skip closed markets (stale data on closed markets is expected)
  const marketSources = [
    { card: markets.crypto, sourceHealth: health.sourceHealth.find((m) => m.market === "crypto") },
    { card: markets.us, sourceHealth: health.sourceHealth.find((m) => m.market === "us") },
    { card: markets.india, sourceHealth: health.sourceHealth.find((m) => m.market === "india") },
  ];
  for (const { card, sourceHealth: src } of marketSources) {
    const marketOpen = src?.open ?? true;
    if (!marketOpen) continue; // closed market stale data is normal, not an incident
    if (card.status === "snapshot") {
      whatHappened.push(`${card.label} market data provider switched to snapshot/fallback mode`);
    } else if (card.status === "degraded") {
      whatHappened.push(`${card.label} market monitoring is partially impaired`);
    } else if (card.status === "blocked") {
      whatHappened.push(`${card.label} market data is currently unavailable`);
    }
  }

  for (const provider of health.providers) {
    if (provider.backoffActive) {
      whatHappened.push(`${provider.label ?? provider.key} entered backoff after repeated failures`);
      recovery.push("Automatic provider retry in progress");
    }
  }

  if (health.snapshotRestoreActive) {
    whatHappened.push("Snapshot restoration is active across one or more markets");
  }

  if (health.engine.status === "warming") {
    whatHappened.push("Signal engine is performing its initial warm-up cycle");
  }

  if (whatHappened.length === 0) {
    whatHappened.push("Some system components are operating in a reduced-confidence state");
  }

  // Impact
  if (status === "degraded") {
    impact.push("Signal timing may be slightly delayed");
    impact.push("Structure and trend analysis remain valid");
    impact.push("Entry precision may be reduced temporarily");
  } else if (status === "partial_outage") {
    impact.push("New signals from one or more markets may be paused");
    impact.push("Existing signal structures remain visible");
    impact.push("Coverage is reduced — system is auto-recovering");
  } else if (status === "down") {
    impact.push("Live market monitoring is paused");
    impact.push("No new signals are being published until recovery completes");
  } else {
    impact.push("Minor delays may affect signal timing precision");
  }

  // Recovery
  if (recovery.length === 0) {
    recovery.push("System is monitoring for automatic recovery");
  }
  if (health.snapshotRestoreActive) {
    recovery.push("Live mode will resume once provider stability returns");
  }
  recovery.push("No manual intervention is required");

  const title =
    status === "down" ? "Platform Unavailable" :
    status === "partial_outage" ? "Partial Outage Detected" :
    status === "degraded" ? "Data Degradation Detected" :
    "System Notice";

  return { severity, title, whatHappened, impact, recovery };
}
