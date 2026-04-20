import type { AnalysisEntitlements } from "./types";
import type { Viewer } from "@/lib/entitlements";
import { resolveEntitlements } from "@/lib/entitlements";

export function getAnalysisEntitlements(viewer: Viewer | null): AnalysisEntitlements {
  const base = resolveEntitlements(viewer);
  const isPremium = base.isPremium;
  return {
    canViewFullTradePlan: isPremium,
    canViewAdvancedReasoning: isPremium,
    canViewRealtime: isPremium,
    canViewHistoricalEdge: isPremium,
    canViewOnChain: isPremium,
    canViewOrderFlow: isPremium,
    canViewOrderBook: isPremium,
    canViewSmartMoney: isPremium,
    canViewScenarios: isPremium,
    canViewMtfConfluence: isPremium,
    canViewEventAlerts: true,
    canViewDeepEvents: isPremium,
    canCreateAlerts: base.isAuthenticated,
    maxAlertsCount: base.maxAlerts,
    canExportData: isPremium,
  };
}
