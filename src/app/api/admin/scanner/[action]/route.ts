import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";
import { adminSetMarketControl } from "@/lib/admin";
import { toRuntimeErrorResponse } from "@/lib/runtime";

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const { action } = await params;
  const body = await request.json().catch(() => ({}));
  const market = String(body.market ?? "");

  try {
    switch (action) {
      case "enable-market":
        adminSetMarketControl(viewer, market, { enabled: 1 });
        break;
      case "disable-market":
        adminSetMarketControl(viewer, market, { enabled: 0 });
        break;
      case "publish-freeze":
        adminSetMarketControl(viewer, market, { publishFreeze: body.enabled ? 1 : 0 });
        break;
      case "warmup":
        adminSetMarketControl(viewer, market, { warmupBehavior: body.value ?? "normal" });
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
