import { getViewer } from "@/lib/auth";
import { createAlert, getUserAlerts } from "@/lib/user-product";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ rows: getUserAlerts(viewer) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json();
  createAlert(viewer, {
    symbol: body.symbol ? String(body.symbol) : null,
    type: String(body.type ?? "signal_published"),
    config: typeof body.config === "object" && body.config ? body.config : {},
  });
  return Response.json({ ok: true });
}
