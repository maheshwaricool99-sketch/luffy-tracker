import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";
import { adminCreateIncident, adminResolveIncident, adminSetMarketControl } from "@/lib/admin";

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const { action } = await params;
  const body = await request.json().catch(() => ({}));

  switch (action) {
    case "stale-threshold":
      adminSetMarketControl(viewer, String(body.market), { staleThresholdMs: Number(body.value) || 300000 });
      break;
    case "degraded-mode":
      adminSetMarketControl(viewer, String(body.market), { degradedMode: body.enabled ? 1 : 0 });
      break;
    case "incident-open":
      adminCreateIncident(viewer, { scope: String(body.scope ?? "platform"), message: String(body.message ?? "Manual incident") });
      break;
    case "incident-resolve":
      adminResolveIncident(viewer, String(body.id));
      break;
    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, action });
}
