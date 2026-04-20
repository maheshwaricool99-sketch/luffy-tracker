import type { AiAnalysisResponse, AnalysisEntitlements, EventAlert } from "./types";

const DEEP_EVENT_KINDS = new Set<EventAlert["kind"]>([
  "INSIDER_TRADE",
  "SUPPLY_UNLOCK",
  "LARGE_BLOCK_TRADE",
  "UNUSUAL_OPTIONS",
]);

export function serializeAnalysisForEntitlements(
  payload: AiAnalysisResponse,
  entitlements: AnalysisEntitlements,
): AiAnalysisResponse {
  const out: AiAnalysisResponse = {
    ...payload,
    entitlements,
    tradePlan: { ...payload.tradePlan, takeProfits: payload.tradePlan.takeProfits.map((tp) => ({ ...tp })) },
    explanation: {
      ...payload.explanation,
      bullets: [...payload.explanation.bullets],
    },
    events: payload.events.map((event) => ({ ...event })),
  };

  if (!entitlements.canViewMtfConfluence) {
    out.mtfConfluence = {
      ...out.mtfConfluence,
      rows: out.mtfConfluence.rows.filter((row) => row.metric === "trend"),
    };
  }

  if (!entitlements.canViewFullTradePlan) {
    out.tradePlan.takeProfits = out.tradePlan.takeProfits.filter((tp) => tp.level === 1);
    out.tradePlan.trailingStop = undefined;
    if (out.tradePlan.entryPrice != null) {
      out.tradePlan.entryPrice = Math.round(out.tradePlan.entryPrice / 10) * 10;
    }
  }

  if (!entitlements.canViewAdvancedReasoning) {
    const keep = 1;
    out.explanation.bullets = out.explanation.bullets.slice(0, keep);
  }

  if (!entitlements.canViewRealtime) {
    out.liveStatus = {
      ...out.liveStatus,
      isLive: false,
      isStale: true,
      staleReason: "Free tier · 15s delay",
      currentPrice: out.liveStatus.currentPrice == null ? null : Math.round(out.liveStatus.currentPrice),
    };
    out.freshness.price = {
      ...out.freshness.price,
      status: "DELAYED",
    };
  }

  if (!entitlements.canViewHistoricalEdge) out.historicalEdge = null;
  if (!entitlements.canViewOnChain) out.onChain = null;
  if (!entitlements.canViewOrderFlow) out.orderFlow = null;
  if (!entitlements.canViewOrderBook) out.orderBook = null;
  if (!entitlements.canViewSmartMoney) out.smartMoney = null;
  if (!entitlements.canViewScenarios) out.scenarios = null;

  if (!entitlements.canViewDeepEvents) {
    out.events = out.events.filter((event) => !DEEP_EVENT_KINDS.has(event.kind));
  }

  return out;
}
