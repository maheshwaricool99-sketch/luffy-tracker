"use client";

import { useQuery } from "@tanstack/react-query";
import type { AiAnalysisResponse, Timeframe } from "@/lib/analysis/types";

export function useAnalysis(symbol: string, timeframe: Timeframe) {
  return useQuery<AiAnalysisResponse>({
    queryKey: ["analysis", symbol, timeframe],
    queryFn: async () => {
      const response = await fetch(`/api/analysis/${encodeURIComponent(symbol)}?timeframe=${encodeURIComponent(timeframe)}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to load analysis" }));
        throw new Error(error?.error ?? "Failed to load analysis");
      }
      return response.json() as Promise<AiAnalysisResponse>;
    },
    staleTime: 10_000,
    refetchInterval: 20_000,
  });
}
