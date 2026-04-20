import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";
import { jsonError, jsonOk } from "@/lib/http/response";
import { RuntimeFlagKeyList, runtimeConfig } from "@/lib/runtime";
import { runtimeMutationContextFromRequest } from "@/lib/runtime/runtime-route";

export async function POST(request: Request) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;
  const body = await request.json().catch(() => null);
  const changes = Array.isArray(body?.changes) ? body.changes : [];
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (changes.length === 0) {
    return jsonError(400, "INVALID_PAYLOAD", "changes must contain at least one update.");
  }

  const context = {
    ...runtimeMutationContextFromRequest(request, viewer),
    reason,
  };
  const results = [];
  for (const change of changes) {
    if (!RuntimeFlagKeyList.includes(String(change.flag) as never) || typeof change.enabled !== "boolean") continue;
    const result = await runtimeConfig.set(String(change.flag) as never, Boolean(change.enabled), context);
    results.push({ flag: change.flag, enabled: result.enabled, version: result.version });
  }
  return jsonOk({ results });
}
