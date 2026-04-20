import type { HealthSnapshot } from "@/lib/signals/signal-types";
import type { MarketId } from "@/lib/market-data/shared/types";
import type { MarketHealthCard, MarketStatus, SignalQuality } from "./health-types";
import {
  mapDataStateToMarketStatus,
  mapWarmupPhaseToScannerMode,
  mapProviderStatus,
  marketStatusWhatItMeans,
  freshnessAgeToState,
  SKIP_REASON_LABELS,
} from "./health-mappers";

const MARKET_LABELS: Record<string, string> = {
  crypto: "Crypto",
  us: "US Equities",
  india: "India Equities",
};

const MARKET_KEYS = ["crypto", "us", "india"] as const;

function inferSignalQuality(coveragePct: number, dataState: string, providerStatus: string): SignalQuality {
  if (dataState === "live" && coveragePct > 80 && providerStatus === "healthy") return "high";
  if (dataState === "unavailable" || coveragePct < 30) return "low";
  return "medium";
}

function snapshotSafeFor(status: string): string[] {
  return [
    "Trend analysis and structural levels",
    "Regime classification and HTF context",
    "Relative strength and ranking signals",
    "Confidence scoring based on prior data",
  ];
}

function snapshotImpact(): string[] {
  return [
    "Entry micro-timing may lag by a few seconds",
    "Price context reflects last-known-good snapshot",
  ];
}

function buildMarketCard(
  key: "crypto" | "us" | "india",
  health: HealthSnapshot,
  now: number,
): MarketHealthCard {
  const marketId = key as MarketId;
  const source = health.sourceHealth.find((m) => m.market === marketId);
  const scanner = health.scanner.find((m) => m.market === marketId);
  const providers = health.providers.filter((p) => p.market === marketId);

  // Defaults when data is missing
  if (!source || !scanner) {
    return {
      key,
      label: MARKET_LABELS[key] ?? key,
      status: "blocked",
      whatItMeans: marketStatusWhatItMeans("blocked"),
      metrics: { dataSource: "Unknown", signalQuality: "low", latencyMs: null, coverage: 0, totalPairs: 0 },
      signalStats: { generated1h: 0, valid1h: 0, filtered1h: 0, freshnessState: "stale", freshnessAgeMs: null },
      scanner: { mode: "blocked", scanned: 0, total: 0, skipped: 0, completionPct: 0, lastCycleDurationMs: null, reasons: [] },
      providers: [],
      snapshot: { active: false, ageMs: null, reason: null, safeFor: [], impact: [] },
      timestamps: { lastUpdated: null, lastSnapshot: null, lastSuccessfulScan: null },
    };
  }

  const rawStatus = mapDataStateToMarketStatus(
    source.dataState,
    source.restoredCount > 0 && scanner.snapshotRestored,
    source.coveragePct,
    source.providerStatus,
  );
  // When a market is closed (weekend/after-hours), stale or degraded data is expected — not an outage.
  // Downgrade to "snapshot" so the health page shows normal closed-market state instead of an alarm.
  const status: MarketStatus = (!source.open && (rawStatus === "degraded" || rawStatus === "blocked"))
    ? "snapshot"
    : rawStatus;

  const freshnessAgeMs = source.lastSyncTs ? now - source.lastSyncTs : null;
  const scannerMode = mapWarmupPhaseToScannerMode(
    scanner.warmupPhase,
    scanner.degradedMode,
    scanner.providerBackoffActive,
    scanner.usableCoveragePct,
  );
  const freshnessState =
    !scanner.lastSuccessfulScanMs ? "STALE" :
    now - scanner.lastSuccessfulScanMs <= 6 * 60_000 ? "LIVE" :
    now - scanner.lastSuccessfulScanMs <= 10 * 60_000 ? "SLOW" :
    "STALE";

  // Build skip reasons list from scanner
  const reasons = Object.entries(scanner.skipReasons ?? {})
    .filter(([, count]) => (count ?? 0) > 0)
    .map(([code, count]) => ({
      code,
      label: SKIP_REASON_LABELS[code as keyof typeof SKIP_REASON_LABELS] ?? code,
      count: count ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Estimate signal counts from engine data
  const totalValidationFailures = Object.values(health.validationFailures ?? {}).reduce((a, b) => a + b, 0);
  const publishedCount = health.engine.publishedCount ?? 0;
  const generatedEstimate = publishedCount + Math.round(totalValidationFailures / (MARKET_KEYS.length));
  const filteredEstimate = Math.round(totalValidationFailures / MARKET_KEYS.length);

  // Snapshot info
  const snapshotActive = scanner.snapshotRestored || source.dataState === "restored_snapshot";
  const snapshotAgeMs = scanner.lastSnapshotAt ? now - scanner.lastSnapshotAt : null;
  const snapshotReason = snapshotActive
    ? source.fallbackActive
      ? "Live provider unavailable or unstable"
      : "Snapshot protection activated during degraded scan cycle"
    : null;

  // Provider list
  const providerItems = providers.map((p) => ({
    name: p.label ?? p.source ?? p.key,
    status: mapProviderStatus(p.status, p.backoffActive, source.fallbackActive),
    latencyMs: null as number | null,
    lastSuccessMs: p.lastSuccessAt,
    note: p.lastError ?? undefined,
  }));

  if (providerItems.length === 0) {
    providerItems.push({
      name: source.primarySource ?? "Primary Provider",
      status: mapProviderStatus(source.providerStatus, source.providerBackoffActive, source.fallbackActive),
      latencyMs: null,
      lastSuccessMs: source.lastSyncTs,
      note: undefined,
    });
  }

  return {
    key,
    label: MARKET_LABELS[key] ?? key,
    status,
    whatItMeans: marketStatusWhatItMeans(status),
    metrics: {
      dataSource: source.primarySource ?? "Internal",
      signalQuality: inferSignalQuality(scanner.usableCoveragePct || source.coveragePct, source.dataState, source.providerStatus),
      latencyMs: null,
      coverage: Math.round(scanner.usableCoveragePct || source.coveragePct),
      totalPairs: scanner.totalSymbols,
    },
    signalStats: {
      generated1h: generatedEstimate,
      valid1h: publishedCount,
      filtered1h: filteredEstimate,
      freshnessState: freshnessAgeToState(freshnessAgeMs),
      freshnessAgeMs,
    },
    scanner: {
      mode: scannerMode,
      freshnessState,
      scanned: scanner.scannedSymbols,
      total: scanner.totalSymbols,
      skipped: scanner.skippedCount,
      completionPct: Math.round(scanner.usableCoveragePct || scanner.coveragePct),
      lastCycleDurationMs: scanner.scanDurationMs ?? null,
      reasons,
    },
    providers: providerItems,
    snapshot: {
      active: snapshotActive,
      ageMs: snapshotAgeMs,
      reason: snapshotReason,
      safeFor: snapshotActive ? snapshotSafeFor(status) : [],
      impact: snapshotActive ? snapshotImpact() : [],
    },
    timestamps: {
      lastUpdated: source.lastSyncTs ?? null,
      lastSnapshot: scanner.lastSnapshotAt ?? null,
      lastSuccessfulScan: scanner.lastPublishEligibleCycleAt ?? scanner.lastSuccessfulScanMs ?? scanner.lastGoodScanAt ?? null,
    },
  };
}

export function buildMarketHealthCards(health: HealthSnapshot, now: number): {
  crypto: MarketHealthCard;
  us: MarketHealthCard;
  india: MarketHealthCard;
} {
  return {
    crypto: buildMarketCard("crypto", health, now),
    us: buildMarketCard("us", health, now),
    india: buildMarketCard("india", health, now),
  };
}
