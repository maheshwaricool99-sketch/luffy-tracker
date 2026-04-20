import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";
import { jsonOk } from "@/lib/http/response";
import { listMembers } from "@/lib/admin";

export async function GET(request: Request) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  const { searchParams } = new URL(request.url);
  return jsonOk(listMembers({
    query: searchParams.get("query") ?? undefined,
    role: searchParams.get("role") ?? undefined,
    plan: searchParams.get("plan") ?? undefined,
    verification: searchParams.get("verification") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    subscriptionStatus: searchParams.get("subscriptionStatus") ?? undefined,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
    offset: searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined,
  }));
}
