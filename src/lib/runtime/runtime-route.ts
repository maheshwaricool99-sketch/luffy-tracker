import { randomUUID } from "node:crypto";
import type { Viewer } from "@/lib/entitlements";

export function runtimeMutationContextFromRequest(request: Request, viewer: Viewer) {
  return {
    actorUserId: viewer.id,
    actorEmail: viewer.email,
    source: "admin_ui" as const,
    requestId: request.headers.get("x-request-id") ?? randomUUID(),
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  };
}
