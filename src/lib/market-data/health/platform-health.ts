import { getMetricsSnapshot } from "../telemetry/metrics";
import { getAllProviderManagers } from "../managers/provider-manager";
import { isWithinTradingHours } from "../core/market-hours";

export function getPlatformHealthStatus() {
  const markets = getAllProviderManagers().map((manager) => manager.getStatus());
  // Only score markets that are within their trading hours — closed markets show
  // 0% coverage by design, which would otherwise drag the platform to "Down".
  const activeMarkets = markets.filter((m) => isWithinTradingHours(m.market));
  const scoringMarkets = activeMarkets.length > 0 ? activeMarkets : markets;
  const score = Math.min(...scoringMarkets.map((market) => market.statusScore));
  const status =
    score >= 90 ? "Operational" :
    score >= 70 ? "Degraded" :
    score >= 40 ? "Partial Outage" :
    "Down";
  return {
    status,
    score,
    markets,
    metrics: getMetricsSnapshot(),
    causes: scoringMarkets.flatMap((market) => market.causes.map((cause) => `${market.market}: ${cause}`)).slice(0, 12),
    degradedComponents: scoringMarkets
      .filter((market) => market.providerState !== "live" || market.publicationState !== "publishable" || !market.coverageHealthyEnough)
      .map((market) => ({
        market: market.market,
        providerState: market.providerState,
        publicationState: market.publicationState,
        scannerFreshEnough: market.scannerFreshEnough,
        coverageHealthyEnough: market.coverageHealthyEnough,
        usableCoveragePct: market.usableCoveragePct,
      })),
    blockedCapabilities: scoringMarkets
      .filter((market) => market.publicationState === "blocked")
      .map((market) => ({ market: market.market, conditions: market.blockingConditions })),
    closedMarkets: markets
      .filter((m) => !isWithinTradingHours(m.market))
      .map((m) => m.market),
  };
}
