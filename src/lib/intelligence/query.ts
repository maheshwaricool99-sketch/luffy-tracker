import { getCustomerHealthSnapshot } from "@/lib/health/query";
import { getSignalsProductSnapshot } from "@/lib/signals/query";
import type { Viewer } from "@/lib/entitlements";

export async function getIntelligenceSnapshot(viewer: Viewer | null) {
  const [signals, health] = await Promise.all([
    getSignalsProductSnapshot({ viewer, limit: 12 }),
    getCustomerHealthSnapshot(),
  ]);

  const cards = signals.data.slice(0, 9).map((signal) => ({
    id: signal.id,
    title: `${signal.symbol} ${signal.direction} setup`,
    market: signal.market,
    timestamp: signal.publishedAt,
    freshness: signal.freshness,
    sourceState: signal.sourceState,
    summary: signal.thesis ?? "No thesis available",
    explanation: signal.rationale.slice(0, 3),
    premium: signal.freshness === "LIVE",
  }));

  return {
    cards,
    marketPulse: health.markets,
    platformStatus: health.platformStatus,
    lastUpdatedAt: health.lastUpdatedAt,
  };
}
