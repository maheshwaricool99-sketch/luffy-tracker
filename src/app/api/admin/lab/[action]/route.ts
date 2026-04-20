import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";

export async function POST(_request: Request, { params }: { params: Promise<{ action: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  if (gate.appRole !== "SUPERADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { action } = await params;
  return NextResponse.json({ ok: true, action, sandbox: true });
}
