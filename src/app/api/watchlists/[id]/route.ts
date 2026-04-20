import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { deleteWatchlist, updateWatchlist } from "@/lib/user-product";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  updateWatchlist(viewer, id, {
    name: body.name,
    symbols: Array.isArray(body.symbols) ? body.symbols : undefined,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  deleteWatchlist(viewer, id);
  return NextResponse.json({ ok: true });
}
