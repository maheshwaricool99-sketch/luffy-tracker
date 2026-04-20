import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";
import { jsonOk } from "@/lib/http/response";
import { runtimeConfig } from "@/lib/runtime";

export async function GET() {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const snapshot = await runtimeConfig.getAll(true);
  return jsonOk({
    flags: snapshot.flags,
    updatedAt: snapshot.updatedAt,
    version: snapshot.version,
    audit: await runtimeConfig.getAuditLogs(50),
  }, { headers: { "Cache-Control": "no-store" } });
}
