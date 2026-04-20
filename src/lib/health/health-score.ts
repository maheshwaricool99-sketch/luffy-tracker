import type { HealthSnapshot } from "@/lib/signals/signal-types";
import type { LuffySnapshot } from "@/lib/luffy-lite-engine";
import type { ReliabilityBreakdown, ReliabilityInfo, ReliabilityLabel } from "./health-types";
import { RELIABILITY_THRESHOLDS, SCORE_WEIGHTS } from "./health-thresholds";

function clamp(value: number, min = 0, max = 10): number {
  return Math.max(min, Math.min(max, value));
}

function computeFreshnessScore(health: HealthSnapshot, now: number): number {
  let score = 10;
  const { sourceHealth, engine } = health;

  // Penalize for stale/unavailable markets
  for (const market of sourceHealth) {
    if (market.dataState === "unavailable") { score -= 3; continue; }
    if (market.dataState === "stale") { score -= 2; continue; }
    if (market.dataState === "restored_snapshot") { score -= 1.5; continue; }
    if (market.dataState === "cached") { score -= 0.75; continue; }
    if (market.dataState === "delayed") { score -= 0.3; }
    // Penalize freshness age
    const ageMs = now - (market.lastSyncTs ?? 0);
    if (ageMs > 300_000) score -= 1.5;
    else if (ageMs > 120_000) score -= 0.75;
    else if (ageMs > 30_000) score -= 0.25;
  }

  // Penalize if engine hasn't run recently
  if (engine.lastRun > 0) {
    const engineAgeMs = now - engine.lastRun;
    if (engineAgeMs > 600_000) score -= 2;
    else if (engineAgeMs > 120_000) score -= 0.5;
  }

  return clamp(score);
}

function computeLivePriceCoveragePct(health: HealthSnapshot): number {
  const totals = health.sourceHealth.reduce((acc, market) => {
    acc.live += market.liveCount;
    acc.total += market.liveCount + market.cachedCount + market.restoredCount + market.staleCount;
    return acc;
  }, { live: 0, total: 0 });
  return totals.total > 0 ? (totals.live / totals.total) * 100 : 100;
}

function computeFallbackUsagePct(health: HealthSnapshot): number {
  const totals = health.sourceHealth.reduce((acc, market) => {
    acc.fallback += market.cachedCount + market.restoredCount;
    acc.total += market.liveCount + market.cachedCount + market.restoredCount + market.staleCount;
    return acc;
  }, { fallback: 0, total: 0 });
  return totals.total > 0 ? (totals.fallback / totals.total) * 100 : 0;
}

function computeScannerFreshnessPct(health: HealthSnapshot, now: number): number {
  if (health.scanner.length === 0) return 0;
  const healthy = health.scanner.filter((market) => {
    const age = market.lastSuccessfulScanMs ?? market.lastGoodScanAt ?? market.lastScanTime ?? 0;
    return age > 0 && now - age <= 120_000;
  }).length;
  return (healthy / health.scanner.length) * 100;
}

function computeSignalEligibilityPct(health: HealthSnapshot): number {
  const blocked = health.blockedSignals?.filter((item) => item.active).length ?? 0;
  const published = health.engine.publishedCount ?? 0;
  const total = blocked + published;
  return total > 0 ? (published / total) * 100 : 100;
}

function computeMarketCoveragePct(health: HealthSnapshot): number {
  if (health.sourceHealth.length === 0) return 0;
  return health.sourceHealth.reduce((sum, market) => sum + market.coveragePct, 0) / health.sourceHealth.length;
}

function computeSymbolFreshnessPct(health: HealthSnapshot): number {
  const totals = health.sourceHealth.reduce((acc, market) => {
    acc.fresh += market.liveCount + market.cachedCount;
    acc.total += market.liveCount + market.cachedCount + market.restoredCount + market.staleCount;
    return acc;
  }, { fresh: 0, total: 0 });
  return totals.total > 0 ? (totals.fresh / totals.total) * 100 : 100;
}

function computeCrossCheckConsistencyPct(health: HealthSnapshot): number {
  const mismatches = Object.entries(health.validationFailures)
    .filter(([key]) => key.includes("timestamp-mismatch") || key.includes("price"))
    .reduce((sum, [, count]) => sum + count, 0);
  const total = Math.max(1, health.engine.publishedCount + mismatches);
  return Math.max(0, 100 - (mismatches / total) * 100);
}

function computeDataIntegrityScore(health: HealthSnapshot): number {
  let score = 10;
  const { sourceHealth, validationFailures, fallbackUsage, snapshotRestoreActive } = health;

  if (snapshotRestoreActive) score -= 1.5;

  // Live/snapshot mix penalty
  const liveMarkets = sourceHealth.filter((m) => m.dataState === "live").length;
  const totalMarkets = sourceHealth.length;
  if (totalMarkets > 0) {
    const liveRatio = liveMarkets / totalMarkets;
    if (liveRatio < 0.33) score -= 2;
    else if (liveRatio < 0.67) score -= 1;
  }

  // Validation failure penalty
  const totalFailures = Object.values(validationFailures).reduce((a, b) => a + b, 0);
  if (totalFailures > 20) score -= 1.5;
  else if (totalFailures > 5) score -= 0.5;

  // Fallback usage penalty
  const fallbackKeys = Object.keys(fallbackUsage).length;
  if (fallbackKeys > 2) score -= 1;
  else if (fallbackKeys > 0) score -= 0.5;

  // Degraded reasons penalty
  const { degradedReasons } = health;
  score -= Math.min(2, degradedReasons.length * 0.4);

  return clamp(score);
}

function computeCoverageScore(health: HealthSnapshot): number {
  let score = 10;
  const { sourceHealth } = health;

  const avgCoverage = sourceHealth.length > 0
    ? sourceHealth.reduce((sum, m) => sum + m.coveragePct, 0) / sourceHealth.length
    : 0;

  if (avgCoverage < 30) score -= 4;
  else if (avgCoverage < 60) score -= 2.5;
  else if (avgCoverage < 80) score -= 1;
  else if (avgCoverage < 90) score -= 0.4;

  // Stall penalty
  for (const market of sourceHealth) {
    if (market.staleCount > market.liveCount + market.cachedCount) score -= 1;
  }

  return clamp(score);
}

function computeExecutionReadinessScore(health: HealthSnapshot, luffy?: LuffySnapshot | null): number {
  let score = 10;

  if (health.engine.status === "warming") score -= 2;
  if (health.engine.status === "restored") score -= 1;
  if (health.engine.inFlight) return score; // Fine

  if (luffy) {
    if (!luffy.trackerHealthy) score -= 2;
    if (luffy.lastError) score -= 0.5;
    if (!luffy.macroContext.allowNewTrades) score -= 1.5;
  }

  return clamp(score);
}

function computeMacroStabilityScore(luffy?: LuffySnapshot | null): number {
  if (!luffy) return 7; // Neutral when data unavailable

  const { macroContext } = luffy;
  let score = 10;

  if (!macroContext.allowNewTrades) score -= 3;
  if (macroContext.blockWeakSignals) score -= 1;
  if (macroContext.volatilityRegime === "high") score -= 1.5;
  if (macroContext.tensionIndex > 0.7) score -= 1;
  else if (macroContext.tensionIndex > 0.5) score -= 0.5;

  return clamp(score);
}

function computeProviderQualityScore(health: HealthSnapshot): number {
  const { providers } = health;
  if (!providers || providers.length === 0) return 7;

  let score = 10;
  for (const provider of providers) {
    if (provider.status === "unavailable") { score -= 2.5; continue; }
    if (provider.backoffActive) { score -= 1.5; continue; }
    if (provider.status === "backoff") { score -= 1.5; continue; }
    if (provider.status === "degraded") { score -= 1; continue; }
    if (provider.consecutiveFailures > 3) score -= 0.5;
    if (provider.successRate < 0.7) score -= 0.75;
    else if (provider.successRate < 0.9) score -= 0.25;
  }

  return clamp(score);
}

function resolveLabel(score: number): ReliabilityLabel {
  if (score >= RELIABILITY_THRESHOLDS.high_confidence_min) return "high_confidence";
  if (score >= RELIABILITY_THRESHOLDS.use_caution_min) return "use_caution";
  return "not_reliable";
}

function buildExplanation(label: ReliabilityLabel, breakdown: ReliabilityBreakdown): string {
  if (label === "high_confidence") {
    return "Fresh data, healthy coverage, and stable system conditions support high trust in current signals.";
  }
  if (label === "use_caution") {
    const issues: string[] = [];
    if (breakdown.freshness < 7) issues.push("data freshness is slightly reduced");
    if (breakdown.coverage < 7) issues.push("scan coverage is below ideal");
    if (breakdown.dataIntegrity < 7) issues.push("some fallback sources are active");
    if (breakdown.macroStability < 7) issues.push("macro conditions are filtering weak setups");
    return `Signals remain usable, but ${issues.length > 0 ? issues.join(", ") : "some conditions"} may affect timing or confidence.`;
  }
  return "Freshness or data integrity is too impaired for strong confidence in new signals. Monitor the system status before acting.";
}

export function computeReliabilityScore(
  health: HealthSnapshot,
  now: number,
  luffy?: LuffySnapshot | null,
): ReliabilityInfo {
  const breakdown: ReliabilityBreakdown = {
    freshness: computeFreshnessScore(health, now),
    dataIntegrity: computeDataIntegrityScore(health),
    coverage: computeCoverageScore(health),
    executionReadiness: computeExecutionReadinessScore(health, luffy),
    macroStability: computeMacroStabilityScore(luffy),
    providerQuality: computeProviderQualityScore(health),
  };

  const score = clamp(
    breakdown.freshness * SCORE_WEIGHTS.freshness +
    breakdown.dataIntegrity * SCORE_WEIGHTS.dataIntegrity +
    breakdown.coverage * SCORE_WEIGHTS.coverage +
    breakdown.executionReadiness * SCORE_WEIGHTS.executionReadiness +
    breakdown.macroStability * SCORE_WEIGHTS.macroStability +
    breakdown.providerQuality * SCORE_WEIGHTS.providerQuality,
  );

  const label = resolveLabel(score);
  const livePriceCoveragePct = computeLivePriceCoveragePct(health);
  const fallbackUsagePct = computeFallbackUsagePct(health);
  const scannerFreshnessPct = computeScannerFreshnessPct(health, now);
  const signalEligibilityPct = computeSignalEligibilityPct(health);
  const providerHealthPct = Math.round((breakdown.providerQuality / 10) * 100);
  const marketCoveragePct = computeMarketCoveragePct(health);
  const symbolFreshnessPct = computeSymbolFreshnessPct(health);
  const crossCheckConsistencyPct = computeCrossCheckConsistencyPct(health);

  const trustPosture =
    livePriceCoveragePct >= 97 && fallbackUsagePct <= 2 && scannerFreshnessPct >= 95 ? "TRUSTED" :
    livePriceCoveragePct >= 90 && fallbackUsagePct <= 8 && scannerFreshnessPct >= 75 ? "CAUTION" :
    livePriceCoveragePct >= 75 && scannerFreshnessPct >= 50 ? "DEGRADED" :
    "UNRELIABLE";

  return {
    score: Math.round(score * 10) / 10,
    label,
    breakdown,
    explanation: buildExplanation(label, breakdown),
    trustPosture,
    metrics: {
      livePriceCoveragePct: Math.round(livePriceCoveragePct * 10) / 10,
      fallbackUsagePct: Math.round(fallbackUsagePct * 10) / 10,
      scannerFreshnessPct: Math.round(scannerFreshnessPct * 10) / 10,
      signalEligibilityPct: Math.round(signalEligibilityPct * 10) / 10,
      providerHealthPct,
      marketCoveragePct: Math.round(marketCoveragePct * 10) / 10,
      symbolFreshnessPct: Math.round(symbolFreshnessPct * 10) / 10,
      crossCheckConsistencyPct: Math.round(crossCheckConsistencyPct * 10) / 10,
      incidentPenalty: 0,
    },
  };
}
