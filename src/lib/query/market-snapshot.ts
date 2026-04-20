"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./keys";

interface ScannerSnapshotSummary {
  healthy: boolean;
  totalSymbolsScanned: number;
  scanCount: number;
  [key: string]: unknown;
}

async function fetchMarketSnapshot(): Promise<ScannerSnapshotSummary> {
  const res = await fetch("/api/market-snapshot", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<ScannerSnapshotSummary>;
}

export function useMarketSnapshot() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: fetchMarketSnapshot,
    staleTime: 25_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
