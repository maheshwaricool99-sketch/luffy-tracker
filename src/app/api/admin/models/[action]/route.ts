import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";
import { adminSetModelControl } from "@/lib/admin";
import { toRuntimeErrorResponse } from "@/lib/runtime";

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;
  const { action } = await params;
  const body = await request.json().catch(() => ({}));
  const model = String(body.model ?? "");

  try {
    switch (action) {
      case "enable":
        adminSetModelControl(viewer, model, { enabled: 1 });
        break;
      case "disable":
        adminSetModelControl(viewer, model, { enabled: 0 });
        break;
      case "threshold":
        adminSetModelControl(viewer, model, { threshold: Number(body.value) || 70 });
        break;
      default:
        return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, action });
  } catch (error) {
    const runtimeError = toRuntimeErrorResponse(error);
    if (runtimeError) return NextResponse.json(runtimeError.body, { status: runtimeError.status });
    throw error;
  }
}
