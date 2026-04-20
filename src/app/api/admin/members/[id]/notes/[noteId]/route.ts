import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";
import { adminDeleteMemberNote } from "@/lib/admin";
import { jsonOk } from "@/lib/http/response";
import { toRuntimeErrorResponse } from "@/lib/runtime";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const { noteId } = await params;
  try {
    return jsonOk(adminDeleteMemberNote(gate, noteId));
  } catch (error) {
    const runtimeError = toRuntimeErrorResponse(error);
    if (runtimeError) return NextResponse.json(runtimeError.body, { status: runtimeError.status });
    throw error;
  }
}
