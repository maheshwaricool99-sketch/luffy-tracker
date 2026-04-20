import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";
import { adminCreateMemberNote, listMemberNotes } from "@/lib/admin";
import { jsonOk } from "@/lib/http/response";
import { toRuntimeErrorResponse } from "@/lib/runtime";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  return jsonOk({ notes: listMemberNotes(id) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const note = adminCreateMemberNote(gate, id, typeof body?.body === "string" ? body.body : "");
    return jsonOk(note);
  } catch (error) {
    const runtimeError = toRuntimeErrorResponse(error);
    if (runtimeError) return NextResponse.json(runtimeError.body, { status: runtimeError.status });
    throw error;
  }
}
