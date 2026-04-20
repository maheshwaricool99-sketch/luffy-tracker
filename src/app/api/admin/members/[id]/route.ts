import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";
import { assertCsrfOrForbidden } from "@/lib/auth/csrf";
import { adminUpdateMember, getMemberDetail } from "@/lib/admin";
import { jsonError, jsonOk } from "@/lib/http/response";
import { toRuntimeErrorResponse } from "@/lib/runtime";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const detail = getMemberDetail(id);
  if (!detail) return jsonError(404, "NOT_FOUND", "Member not found.");
  return jsonOk(detail);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const body = await request.json();
  try {
    const updated = adminUpdateMember(gate, {
      targetUserId: id,
      plan: body.plan,
      role: body.role,
      accountStatus: body.accountStatus,
      emailVerified: typeof body.emailVerified === "boolean" ? body.emailVerified : undefined,
      reason: body.reason,
    });
    return jsonOk(updated);
  } catch (error) {
    const runtimeError = toRuntimeErrorResponse(error);
    if (runtimeError) return NextResponse.json(runtimeError.body, { status: runtimeError.status });
    throw error;
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const csrf = await assertCsrfOrForbidden(request);
  if (csrf) return csrf;
  const { id } = await params;
  const form = await request.formData();
  try {
    adminUpdateMember(gate, {
      targetUserId: id,
      plan: form.get("plan") ? String(form.get("plan")) as "FREE" | "PREMIUM" : undefined,
      role: form.get("role") ? String(form.get("role")) as "MEMBER" | "ADMIN" : undefined,
      accountStatus: form.get("accountStatus") ? String(form.get("accountStatus")) as "ACTIVE" | "DISABLED" : undefined,
      reason: form.get("reason") ? String(form.get("reason")) : undefined,
    });
    const url = new URL(`/admin/members?userId=${id}&message=updated`, request.url);
    return NextResponse.redirect(url);
  } catch (error) {
    const runtimeError = toRuntimeErrorResponse(error);
    if (runtimeError) return NextResponse.json(runtimeError.body, { status: runtimeError.status });
    throw error;
  }
}
