import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";
import { listAdminSnapshot } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  return NextResponse.json(listAdminSnapshot().incidents, { headers: { "Cache-Control": "no-store" } });
}
