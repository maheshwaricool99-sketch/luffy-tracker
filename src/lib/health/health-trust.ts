import type { HealthSnapshot } from "@/lib/signals/signal-types";
import type { BlockedSignalView, HealthResponse, Incident } from "./health-types";

function incidentWeight(now: number, incident: Incident) {
  const ageMs = now - (incident.lastUpdatedAt ?? incident.ts);
  if (incident.statusV2 === "RESOLVED" && ageMs > 6 * 60 * 60 * 1000) return 0;
  const base =
    incident.severityV2 === "CRITICAL" ? 4 :
    incident.severityV2 === "MAJOR" ? 3 :
    incident.severityV2 === "WARNING" ? 2 :
    1;
  const decay =
    ageMs <= 15 * 60 * 1000 ? 1 :
    ageMs <= 60 * 60 * 1000 ? 0.6 :
    ageMs <= 6 * 60 * 60 * 1000 ? 0.25 :
    incident.statusV2 === "RESOLVED" ? 0 : 0.1;
  return base * decay;
}

function incidentImpact(weightedActiveCount: number): "Low" | "Moderate" | "High" {
  if (weightedActiveCount >= 6) return "High";
  if (weightedActiveCount >= 2.5) return "Moderate";
  return "Low";
}

export function buildTrustPayload(
  health: HealthSnapshot,
  response: Pick<HealthResponse, "markets" | "reliability" | "incidents">,
  now: number,
): HealthResponse["trust"] {
  const fallbackMarkets = (["crypto", "us", "india"] as const).map((marketKey) => {
    const market = response.markets[marketKey];
    const total = Math.max(1, market.scanner.total);
    const fallbackAffected = market.snapshot.active ? Math.max(1, market.scanner.skipped) : 0;
    const fallbackUsagePct = market.snapshot.active ? Math.min(100, (fallbackAffected / total) * 100) : 0;
    const status: "healthy" | "recovering" | "degraded" | "blocked" =
      market.status === "blocked" ? "blocked" :
      market.snapshot.active ? "recovering" :
      market.status === "degraded" ? "degraded" :
      "healthy";
    return {
      market: marketKey,
      livePriceCoveragePct: Math.max(0, Math.round(((total - fallbackAffected) / total) * 100)),
      fallbackUsagePct: Math.round(fallbackUsagePct),
      affectedSymbols: fallbackAffected,
      affectedProviders: market.providers.filter((provider) => provider.status === "fallback" || provider.status === "delayed" || provider.status === "rate_limited").map((provider) => provider.name),
      status,
    };
  });

  const blockedSignals: BlockedSignalView[] = (health.blockedSignals ?? []).map((item) => ({
    signalId: item.signalId,
    symbol: item.symbol,
    market: item.market,
    strategy: item.strategy,
    blockedAt: item.blockedAt,
    reasonCode: item.reasonCode,
    reasonText: item.reasonText,
    primaryProvider: item.primaryProvider,
    fallbackProvider: item.fallbackProvider,
    inputAgeMs: item.inputAgeMs,
    scannerAgeMs: item.scannerAgeMs,
    affectedDependencies: item.affectedDependencies,
    canAutoRecover: item.canAutoRecover,
    nextRetryAt: item.nextRetryAt,
    scope: item.scope,
    active: item.active,
  }));

  const activeMajor = response.incidents.filter((incident) => incident.statusV2 === "ACTIVE" && (incident.severityV2 === "MAJOR" || incident.severityV2 === "CRITICAL")).length;
  const activeWarning = response.incidents.filter((incident) => incident.statusV2 === "ACTIVE" && incident.severityV2 === "WARNING").length;
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const resolvedToday = response.incidents.filter((incident) => incident.statusV2 === "RESOLVED" && (incident.lastUpdatedAt ?? incident.ts) >= startOfDay.getTime()).length;
  const weightedActiveCount = response.incidents.reduce((sum, incident) => sum + incidentWeight(now, incident), 0);

  const fallbackExposureCount = fallbackMarkets.filter((market) => market.fallbackUsagePct > 0).length;
  const fallbackIssueDetails = fallbackMarkets
    .filter((market) => market.fallbackUsagePct > 0)
    .map((market) => `${market.market.toUpperCase()} · ${market.fallbackUsagePct}% fallback exposure · ${market.status}`);

  const blockedReasonCounts = blockedSignals.filter((item) => item.active).reduce<Record<string, number>>((acc, item) => {
    acc[item.reasonCode] = (acc[item.reasonCode] ?? 0) + 1;
    return acc;
  }, {});

  return {
    posture: response.reliability.trustPosture ?? "CAUTION",
    issues: [
      {
        key: "fallback_price_usage",
        title: "Fallback Price Usage",
        severity: fallbackExposureCount === 0 ? "info" : fallbackExposureCount >= 2 ? "warning" : "info",
        status: fallbackExposureCount === 0 ? "Stable" : fallbackMarkets.some((market) => market.status === "recovering") ? "Recovering" : "Degraded",
        summary: fallbackExposureCount === 0 ? "Primary live providers are serving current prices across tracked markets." : `Markets affected: ${fallbackMarkets.filter((market) => market.fallbackUsagePct > 0).map((market) => market.market === "us" ? "US" : market.market === "india" ? "India" : "Crypto").join(", ")}`,
        details: fallbackIssueDetails.length > 0
          ? fallbackIssueDetails
          : ["Fallback exposure is currently below the warning threshold."],
      },
      {
        key: "blocked_signals",
        title: "Blocked Signals",
        severity: blockedSignals.some((item) => item.active) ? "warning" : "info",
        status: blockedSignals.some((item) => item.canAutoRecover && item.active) ? "Safe fail" : "Stable",
        summary: `${blockedSignals.filter((item) => item.active).length} signals currently blocked`,
        details: Object.entries(blockedReasonCounts).length > 0
          ? Object.entries(blockedReasonCounts).map(([code, count]) => `${count} ${code.toLowerCase().replaceAll("_", " ")}`)
          : ["No active blocked signals at the moment."],
      },
      {
        key: "active_reliability_incidents",
        title: "Active Reliability Incidents",
        severity: activeMajor > 0 ? "danger" : activeWarning > 0 ? "warning" : "info",
        status: incidentImpact(weightedActiveCount),
        summary: `${response.incidents.length} incidents tracked`,
        details: [
          `Active major: ${activeMajor}`,
          `Active warning: ${activeWarning}`,
          `Resolved today: ${resolvedToday}`,
          `Impact on trust posture: ${incidentImpact(weightedActiveCount)}`,
        ],
      },
    ],
    fallbackMarkets,
    blockedSignals,
    incidentSummary: {
      activeMajor,
      activeWarning,
      resolvedToday,
      weightedActiveCount: Math.round(weightedActiveCount * 10) / 10,
      impact: incidentImpact(weightedActiveCount),
    },
  };
}
