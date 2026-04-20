import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";
import { adminSignOutMemberSessions } from "@/lib/admin";
import { jsonOk } from "@/lib/http/response";
import { toRuntimeErrorResponse } from "@/lib/runtime";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const result = adminSignOutMemberSessions(gate, id, typeof body?.reason === "string" ? body.reason : undefined);
    return jsonOk(result);
  } catch (error) {
    const runtimeError = toRuntimeErrorResponse(error);
    if (runtimeError) return NextResponse.json(runtimeError.body, { status: runtimeError.status });
    throw error;
  }
}
