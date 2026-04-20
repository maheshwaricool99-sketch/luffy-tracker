import { getViewer } from "@/lib/auth";
import { createWatchlist, getUserWatchlists } from "@/lib/user-product";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ rows: getUserWatchlists(viewer) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json();
  createWatchlist(viewer, {
    name: String(body.name ?? "New watchlist"),
    symbols: Array.isArray(body.symbols) ? body.symbols : [],
  });
  return Response.json({ ok: true });
}
