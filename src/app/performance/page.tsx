export const dynamic = "force-dynamic";

import { getSessionUser } from "@/lib/auth/getSessionUser";
import { getPerformancePayload } from "@/lib/performance/query";
import type { PerformanceRole } from "@/lib/performance/types";
import { PerformancePageClient } from "./components/performance-page-client";

type SessionUser = Awaited<ReturnType<typeof getSessionUser>>;

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

function resolveRole(viewer: SessionUser): PerformanceRole {
  if (!viewer) return "GUEST";
  if (viewer.role === "ADMIN" || viewer.role === "SUPERADMIN") return "ADMIN";
  if (viewer.subscription?.plan === "PREMIUM") return "PREMIUM";
  return "FREE";
}

export default async function PerformancePage({ searchParams }: PageProps) {
  const viewer = await getSessionUser();
  const resolvedSearchParams = searchParams && "then" in searchParams ? await searchParams : searchParams;
  const initialData = await getPerformancePayload(viewer, resolvedSearchParams);
  return <PerformancePageClient role={resolveRole(viewer)} initialData={initialData} />;
}
