"use client";

import { useQuery } from "@tanstack/react-query";
import type { PerformanceApiResponse, PerformanceRole } from "@/lib/performance/types";

async function fetchPerformance(queryString: string) {
  const res = await fetch(`/api/performance${queryString ? `?${queryString}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Performance API error: ${res.status}`);
  return res.json() as Promise<PerformanceApiResponse>;
}

function getRefetchInterval(role: PerformanceRole) {
  if (role === "ADMIN") return 15_000;
  if (role === "PREMIUM") return 30_000;
  return 90_000;
}

export function usePerformancePolling(role: PerformanceRole, queryString: string, initialData: PerformanceApiResponse) {
  return useQuery({
    queryKey: ["performance", role, queryString],
    queryFn: () => fetchPerformance(queryString),
    initialData,
    staleTime: role === "ADMIN" ? 10_000 : role === "PREMIUM" ? 20_000 : 60_000,
    refetchInterval: getRefetchInterval(role),
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
