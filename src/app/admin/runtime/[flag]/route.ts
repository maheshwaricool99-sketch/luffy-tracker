import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";
import { jsonError, jsonOk } from "@/lib/http/response";
import { RuntimeFlagKeyList, RuntimeFlagKeys, runtimeConfig, toRuntimeErrorResponse } from "@/lib/runtime";
import { runtimeMutationContextFromRequest } from "@/lib/runtime/runtime-route";

const PROTECTED_FLAGS = new Set([
  RuntimeFlagKeys.MAINTENANCE_MODE,
  RuntimeFlagKeys.READ_ONLY_MODE,
  RuntimeFlagKeys.PAUSE_SCANNERS,
]);

export async function POST(request: Request, { params }: { params: Promise<{ flag: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const { flag } = await params;
  if (!RuntimeFlagKeyList.includes(flag as never)) {
    return jsonError(400, "RUNTIME_FLAG_UNKNOWN", "Unknown runtime flag.");
  }
  if (PROTECTED_FLAGS.has(flag as never) && viewer.role !== "SUPERADMIN") {
    return jsonError(403, "RUNTIME_FLAG_FORBIDDEN", "Only superadmins may change this runtime flag.");
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.enabled !== "boolean") {
    return jsonError(400, "INVALID_PAYLOAD", "enabled must be a boolean.");
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (PROTECTED_FLAGS.has(flag as never) && reason.length < 5) {
    return jsonError(400, "REASON_REQUIRED", "A meaningful reason is required for this control.");
  }

  try {
    const result = await runtimeConfig.set(flag as never, body.enabled, {
      ...runtimeMutationContextFromRequest(request, viewer),
      reason,
    });
    return jsonOk({
      flag,
      enabled: result.enabled,
      version: result.version,
    });
  } catch (error) {
    const runtimeError = toRuntimeErrorResponse(error);
    if (runtimeError) return NextResponse.json(runtimeError.body, { status: runtimeError.status });
    throw error;
  }
}
