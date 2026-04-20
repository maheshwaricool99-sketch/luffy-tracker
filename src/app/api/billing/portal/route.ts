import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { jsonError, jsonOk, wantsJsonResponse } from "@/lib/http/response";
import { createPortalSession } from "@/lib/stripe";
import { toRuntimeErrorResponse } from "@/lib/runtime";

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return jsonError(401, "UNAUTHENTICATED", "Authentication required.");

  try {
    const session = await createPortalSession(viewer);
    if (wantsJsonResponse(request)) {
      return jsonOk({ url: String(session.url) });
    }
    return NextResponse.redirect(String(session.url));
  } catch (error) {
    const runtimeError = toRuntimeErrorResponse(error);
    if (runtimeError) {
      if (wantsJsonResponse(request)) {
        return NextResponse.json(runtimeError.body, { status: runtimeError.status });
      }
      const url = new URL("/billing", request.url);
      url.searchParams.set("error", runtimeError.body.error.message);
      return NextResponse.redirect(url);
    }
    if (wantsJsonResponse(request)) {
      return jsonError(500, "PORTAL_UNAVAILABLE", error instanceof Error ? error.message : "Portal unavailable");
    }
    const url = new URL("/billing", request.url);
    url.searchParams.set("error", error instanceof Error ? error.message : "Portal unavailable");
    return NextResponse.redirect(url);
  }
}
