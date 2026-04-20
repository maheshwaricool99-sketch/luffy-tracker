import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";
import { getAdminSignals } from "@/lib/signals/queries/getAdminSignals";
import type { MarketType, SignalStatus } from "@/lib/signals/types/signalEnums";

export async function GET(request: Request) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const user = gate;
  const { searchParams } = new URL(request.url);
  return Response.json(await getAdminSignals({
    market: (searchParams.get("market")?.toUpperCase() as MarketType | null) ?? undefined,
    status: (searchParams.get("status")?.toUpperCase() as SignalStatus | null) ?? undefined,
    confidenceMin: searchParams.get("confidenceMin") ? Number(searchParams.get("confidenceMin")) : undefined,
    sortBy: (searchParams.get("sortBy") as "publishedAt" | "confidenceScore" | "symbol" | null) ?? undefined,
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc" | null) ?? undefined,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 50,
    cursor: searchParams.get("cursor"),
    query: searchParams.get("query"),
  }, user.id));
}
