import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";
import { adminSetExperiment } from "@/lib/admin";
import { toRuntimeErrorResponse } from "@/lib/runtime";

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;
  const { action } = await params;
  const body = await request.json().catch(() => ({}));
  if (action !== "upsert") {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
  try {
    adminSetExperiment(viewer, String(body.key), {
      enabled: Boolean(body.enabled),
      description: String(body.description ?? ""),
      audience: String(body.audience ?? "all"),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const runtimeError = toRuntimeErrorResponse(error);
    if (runtimeError) return NextResponse.json(runtimeError.body, { status: runtimeError.status });
    throw error;
  }
}
