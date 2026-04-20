"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./keys";
import type { IntelligencePagePayload } from "@/lib/intelligence/types";

async function fetchIntelligence(): Promise<IntelligencePagePayload> {
  const res = await fetch("/api/intelligence", { cache: "no-store" });
  if (!res.ok) throw new Error(`Intelligence feed error: ${res.status}`);
  return res.json() as Promise<IntelligencePagePayload>;
}

export function useIntelligenceFeed() {
  return useQuery({
    queryKey: queryKeys.intelligence.feed(),
    queryFn: fetchIntelligence,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
