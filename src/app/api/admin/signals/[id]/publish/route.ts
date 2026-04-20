import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";
import { publishSignal } from "@/lib/signals/commands/publishSignal";
import { toRuntimeErrorResponse } from "@/lib/runtime";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const user = gate;
  const { id } = await params;
  const body = await request.json();
  try {
    return NextResponse.json(await publishSignal(id, user.id, String(body.reason ?? ""), Boolean(body.force)));
  } catch (error) {
    const runtimeError = toRuntimeErrorResponse(error);
    if (runtimeError) return NextResponse.json(runtimeError.body, { status: runtimeError.status });
    throw error;
  }
}
