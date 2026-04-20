import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";
import { listEngineAuditEvents } from "@/server/engines/engine-audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const url = new URL(request.url);
  const engineParam = url.searchParams.get("engine");
  const engine = engineParam === "price" || engineParam === "execution" ? engineParam : null;
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
  return NextResponse.json({ items: listEngineAuditEvents(engine, limit) }, { headers: { "Cache-Control": "no-store" } });
}
