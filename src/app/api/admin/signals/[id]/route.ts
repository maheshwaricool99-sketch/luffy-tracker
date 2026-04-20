import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";
import { getSignalById } from "@/lib/signals/queries/getSignalById";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const signal = await getSignalById(id, "ADMIN");
  if (!signal) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(signal);
}
