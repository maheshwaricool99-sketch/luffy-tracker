"use client";

import { useIntelligenceFeed } from "@/lib/query/intelligence";
import { IntelligencePageHeader } from "./IntelligencePageHeader";
import { IntelligenceGrid } from "./IntelligenceGrid";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import type { IntelligencePagePayload } from "@/lib/intelligence/types";

interface IntelligencePageClientProps {
  initialData?: IntelligencePagePayload;
}

export function IntelligencePageClient({ initialData }: IntelligencePageClientProps) {
  const { data, isLoading, isError, error, refetch } = useIntelligenceFeed();

  const payload = data ?? initialData;

  if (!payload && isLoading) {
    return (
      <div>
        <div className="mb-4">
          <div className="h-8 w-48 rounded bg-white/10 animate-pulse mb-2" />
          <div className="h-4 w-80 rounded bg-white/[0.06] animate-pulse" />
        </div>
        <div className="flex flex-wrap gap-2 mb-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 w-28 rounded-xl bg-white/[0.06] animate-pulse" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <LoadingState count={6} />
        </div>
      </div>
    );
  }

  if (!payload && isError) {
    return (
      <div className="grid grid-cols-1">
        <ErrorState
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!payload) return null;

  return (
    <div className="space-y-0">
      <div className="px-0">
        <IntelligencePageHeader stats={payload.stats} isPremium={payload.isPremium} />
      </div>
      <IntelligenceGrid payload={payload} />
    </div>
  );
}
