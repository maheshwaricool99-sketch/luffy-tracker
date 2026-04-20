import type {
  PerformanceClass,
  PerformanceConfidenceBucketKey,
  PerformanceFilters,
  PerformanceMarket,
  PerformanceRange,
  PerformanceRole,
  PerformanceSource,
} from "./types";

export const PERFORMANCE_MARKETS: PerformanceMarket[] = ["CRYPTO", "US", "INDIA"];
export const PERFORMANCE_CLASSES: PerformanceClass[] = ["ELITE", "STRONG", "WATCHLIST"];
export const PERFORMANCE_SOURCES: PerformanceSource[] = ["LIVE", "SNAPSHOT", "DELAYED"];
export const CONFIDENCE_BUCKETS = [
  { key: "90plus" as const, label: "90+", min: 90, max: 100 },
  { key: "80to89" as const, label: "80-89", min: 80, max: 89 },
  { key: "70to79" as const, label: "70-79", min: 70, max: 79 },
  { key: "lt70" as const, label: "<70", min: 0, max: 69 },
] as const;

export const RANGE_TO_DAYS: Record<PerformanceRange, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
};

export const PAGE_SIZE_BY_ROLE: Record<PerformanceRole, number> = {
  GUEST: 3,
  FREE: 5,
  PREMIUM: 25,
  ADMIN: 25,
};

export const MAX_PAGE_SIZE_BY_ROLE: Record<PerformanceRole, number> = {
  GUEST: 3,
  FREE: 5,
  PREMIUM: 100,
  ADMIN: 100,
};

export const CACHE_TTL_SEC_BY_ROLE: Record<PerformanceRole, number> = {
  GUEST: 90,
  FREE: 90,
  PREMIUM: 30,
  ADMIN: 15,
};

export const DEFAULT_FILTERS: Omit<PerformanceFilters, "includeAdmin" | "refresh"> = {
  market: "all",
  class: "all",
  confidenceBucket: "all",
  range: "30d",
  source: "all",
  page: 1,
  pageSize: 10,
};

export function getConfidenceBucketLabel(bucket: PerformanceConfidenceBucketKey) {
  return CONFIDENCE_BUCKETS.find((item) => item.key === bucket)?.label ?? null;
}
