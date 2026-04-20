import { getSessionUser } from "@/lib/auth/getSessionUser";
import { listSignals } from "@/lib/signals/queries/listSignals";
import type { AppRole, MarketType, SignalStatus } from "@/lib/signals/types/signalEnums";

export const dynamic = "force-dynamic";

function resolveRole(user: Awaited<ReturnType<typeof getSessionUser>>): AppRole {
  if (!user) return "GUEST";
  return user.appRole;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user = await getSessionUser();
  const role = resolveRole(user);
  const result = await listSignals({
    market: (searchParams.get("market")?.toUpperCase() as MarketType | null) ?? undefined,
    status: (searchParams.get("status")?.toUpperCase() as SignalStatus | null) ?? undefined,
    confidenceMin: searchParams.get("confidenceMin") ? Number(searchParams.get("confidenceMin")) : undefined,
    sortBy: (searchParams.get("sortBy") as "publishedAt" | "confidenceScore" | "symbol" | null) ?? undefined,
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc" | null) ?? undefined,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 20,
    cursor: searchParams.get("cursor"),
    query: searchParams.get("query"),
  }, role, user?.id);

  return Response.json({
    ...result,
    meta: {
      role,
      delayed: role === "GUEST" || role === "FREE",
    },
  }, { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" } });
}
