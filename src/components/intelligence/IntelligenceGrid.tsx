"use client";

import { useMemo, useCallback, useReducer } from "react";
import type { IntelligencePagePayload, IntelligenceFilters, IntelligenceSignal } from "@/lib/intelligence/types";
import { IntelligenceStickyFilters } from "./IntelligenceStickyFilters";
import { SignalCard } from "./SignalCard";
import { EmptyState } from "./EmptyState";
import { UpgradeCTAInline } from "./UpgradeCTAInline";

const DEFAULT_FILTERS: IntelligenceFilters = {
  market: "ALL",
  direction: "ALL",
  sortBy: "score",
};

function filterReducer(
  state: IntelligenceFilters,
  action: Partial<IntelligenceFilters> | "RESET",
): IntelligenceFilters {
  if (action === "RESET") return DEFAULT_FILTERS;
  return { ...state, ...action };
}

function applyFilters(signals: IntelligenceSignal[], filters: IntelligenceFilters): IntelligenceSignal[] {
  let result = signals;

  if (filters.market && filters.market !== "ALL") {
    result = result.filter((s) => s.market === filters.market);
  }
  if (filters.direction && filters.direction !== "ALL") {
    result = result.filter((s) => s.direction === filters.direction);
  }
  if (filters.query) {
    const q = filters.query.toUpperCase();
    result = result.filter((s) => s.symbol.includes(q) || (s.assetName ?? "").toUpperCase().includes(q));
  }
  if (filters.onlyPremiumGrade) {
    result = result.filter((s) => s.qualityGrade === "ELITE" || s.qualityGrade === "STRONG");
  }
  if (filters.onlyLive) {
    result = result.filter((s) => s.feedMeta.integrityStatus === "LIVE" || s.feedMeta.integrityStatus === "VERIFIED");
  }
  if (filters.onlyMultiStrategy) {
    result = result.filter((s) => s.strategyContributions.filter((c) => c.enabledAtPublish).length > 1);
  }
  if (filters.onlyAdminReviewed) {
    result = result.filter((s) => s.adminReviewed);
  }
  if (filters.onlyActionReady) {
    result = result.filter((s) => s.actionability === "READY_NOW" || s.actionability === "WAIT_FOR_TRIGGER");
  }
  if (filters.confidenceMin) {
    result = result.filter((s) => s.confidence >= (filters.confidenceMin ?? 0));
  }
  if (filters.rrMin && filters.rrMin > 0) {
    result = result.filter((s) => !s.tradePlan.locked && (s.tradePlan.riskReward ?? 0) >= (filters.rrMin ?? 0));
  }
  if (filters.timeframe && filters.timeframe !== "ALL") {
    result = result.filter((s) => s.timeframe === filters.timeframe);
  }

  switch (filters.sortBy ?? "score") {
    case "confidence":
      result = [...result].sort((a, b) => b.confidence - a.confidence);
      break;
    case "freshness":
      result = [...result].sort((a, b) => a.feedMeta.freshnessMs - b.feedMeta.freshnessMs);
      break;
    case "rr":
      result = [...result].sort((a, b) => (b.tradePlan.riskReward ?? 0) - (a.tradePlan.riskReward ?? 0));
      break;
    case "strategies":
      result = [...result].sort((a, b) => b.strategyContributions.length - a.strategyContributions.length);
      break;
    case "actionability":
      {
        const order = { READY_NOW: 0, WAIT_FOR_TRIGGER: 1, WATCH_RETEST: 2, TOO_EXTENDED: 3, INFORMATIONAL_ONLY: 4 };
        result = [...result].sort((a, b) => (order[a.actionability] ?? 4) - (order[b.actionability] ?? 4));
      }
      break;
    case "recent":
      result = [...result].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
      break;
    case "score":
    default:
      result = [...result].sort((a, b) => {
        if (a.adminPriority !== b.adminPriority) return a.adminPriority ? -1 : 1;
        return b.finalRankScore - a.finalRankScore;
      });
  }

  return result;
}

interface IntelligenceGridProps {
  payload: IntelligencePagePayload;
  onSelectSignal?: (id: string) => void;
  selectedSignalId?: string;
}

export function IntelligenceGrid({ payload, onSelectSignal, selectedSignalId }: IntelligenceGridProps) {
  const [filters, dispatch] = useReducer(filterReducer, DEFAULT_FILTERS);
  const handleChange = useCallback((partial: Partial<IntelligenceFilters>) => dispatch(partial), []);
  const handleReset = useCallback(() => dispatch("RESET"), []);

  const filtered = useMemo(() => applyFilters(payload.signals, filters), [payload.signals, filters]);

  const hasFilters =
    filters.market !== "ALL" ||
    filters.direction !== "ALL" ||
    !!filters.query ||
    filters.onlyPremiumGrade ||
    filters.onlyLive;

  return (
    <div>
      <IntelligenceStickyFilters
        filters={filters}
        onChange={handleChange}
        onReset={handleReset}
        isAdmin={payload.isAdmin}
        isPremium={payload.isPremium}
        totalCount={payload.signals.length}
        filteredCount={filtered.length}
      />

      <div className="p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.length === 0 ? (
            <EmptyState filtered={!!hasFilters} />
          ) : (
            filtered.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                selected={selectedSignalId === signal.id}
                isAdmin={payload.isAdmin}
                onSelect={onSelectSignal}
              />
            ))
          )}

          {!payload.isPremium && payload.stats.premiumCount > 0 && (
            <div className="md:col-span-2 xl:col-span-1">
              <UpgradeCTAInline premiumCount={payload.stats.premiumCount} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
