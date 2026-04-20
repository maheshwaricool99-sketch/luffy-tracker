import { getViewer } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/signals/signal-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await getDashboardSnapshot(), { headers: { "Cache-Control": "no-store" } });
}
