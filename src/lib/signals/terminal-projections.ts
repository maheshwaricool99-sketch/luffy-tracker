import type { MarketId } from "@/lib/market-data/shared/types";
import type { PublishedSignal } from "./signal-types";

export function projectPredictionRows(signals: PublishedSignal[]) {
  return signals.map((signal) => ({
    symbol: signal.symbol,
    marketId: signal.market,
    direction: signal.direction,
    confidence: signal.confidence,
    class: signal.class,
    entry: signal.entry,
    stopLoss: signal.stopLoss,
    takeProfit: signal.takeProfit,
    expectedR: signal.expectedR,
    freshness: signal.sourceMeta.priceAgeMs,
    timestamp: signal.timestamp,
    regime: `${signal.regime.trend}/${signal.regime.volatility}/${signal.regime.liquidity}`,
    rationale: signal.rationale[0] ?? "",
    lifecycleState: signal.lifecycleState,
    dataQuality: signal.dataQuality,
  }));
}

export function projectWhaleRows(signals: PublishedSignal[]) {
  return signals
    .filter((signal) => signal.market === "crypto")
    .map((signal) => ({
      symbol: signal.symbol,
      marketId: signal.market,
      whaleScore: Math.round(signal.contributors.luffy ?? 0),
      accumulation: signal.scoreBreakdown.volume,
      flowBias: signal.direction === "long" ? "bullish" : "bearish",
      confidence: signal.confidence,
      reason: signal.rationale[0] ?? "",
    }));
}

export function projectDerivativesRows(signals: PublishedSignal[]) {
  return signals
    .filter((signal) => signal.market === "crypto")
    .map((signal) => ({
      symbol: signal.symbol,
      marketId: signal.market,
      funding: Number((((signal.direction === "long" ? 1 : -1) * signal.scoreBreakdown.derivatives) / 10_000).toFixed(4)),
      openInterest: Math.round((signal.confidence + signal.scoreBreakdown.derivatives) * 1_000_000),
      derivativesScore: signal.scoreBreakdown.derivatives,
      stage: signal.class === "elite" ? "ACTIVE" : signal.class === "strong" ? "DEVELOPING" : "EARLY",
      reason: signal.rationale[0] ?? "",
    }));
}

export function projectLiquidationRows(signals: PublishedSignal[]) {
  return signals
    .filter((signal) => signal.market === "crypto")
    .map((signal) => ({
      symbol: signal.symbol,
      marketId: signal.market,
      longLiquidationZone: Number((signal.entry * 0.97).toFixed(4)),
      shortLiquidationZone: Number((signal.entry * 1.03).toFixed(4)),
      heatScore: Math.round((signal.confidence + signal.expectedR * 20) / 2),
      reason: signal.rationale[0] ?? "",
    }));
}

export function projectIndiaRows(signals: PublishedSignal[]) {
  return signals
    .filter((signal) => signal.market === "india")
    .map((signal) => ({
      symbol: signal.symbol,
      companyName: signal.symbol,
      price: signal.entry,
      signalScore: signal.confidence,
      stage: signal.class === "elite" ? "ACTIVE" : signal.class === "strong" ? "DEVELOPING" : "EARLY",
      volumeAnomaly: signal.scoreBreakdown.volume,
      relativeStrength: signal.scoreBreakdown.trend,
      breakoutProbability: signal.confidence,
      reason: signal.rationale[0] ?? "",
      freshness: signal.sourceMeta.priceAgeMs,
    }));
}

export function projectCatalystRows(signals: PublishedSignal[], market?: MarketId) {
  return signals
    .filter((signal) => !market || signal.market === market)
    .map((signal) => ({
      symbol: signal.symbol,
      marketId: signal.market,
      catalystScore: signal.scoreBreakdown.trend,
      type: signal.class,
      freshness: signal.dataQuality,
      sentiment: signal.confidence,
      movedPct: Number((((signal.takeProfit - signal.entry) / Math.max(signal.entry, 1e-9)) * 100).toFixed(2)),
      stage: signal.class === "elite" ? "ACTIVE" : signal.class === "strong" ? "DEVELOPING" : "EARLY",
      reason: signal.rationale[0] ?? "",
    }));
}
