import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { deleteAlert, updateAlert } from "@/lib/user-product";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  updateAlert(viewer, id, {
    enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
    config: body.config,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  deleteAlert(viewer, id);
  return NextResponse.json({ ok: true });
}
