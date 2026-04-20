import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";
import { computeEngineStatus } from "@/server/engines/engine-status";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  return NextResponse.json(computeEngineStatus(), { headers: { "Cache-Control": "no-store" } });
}
