import type { MarketType, SignalStatus } from "./signalEnums";

export interface SignalListFilters {
  market?: MarketType;
  status?: SignalStatus;
  confidenceMin?: number;
  sortBy?: "publishedAt" | "confidenceScore" | "symbol";
  sortOrder?: "asc" | "desc";
  limit?: number;
  cursor?: string | null;
  query?: string | null;
}
