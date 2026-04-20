import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";
import {
  reloadExecutionConfig,
  restartExecutionEngine,
  setExecutionMode,
} from "@/server/engines/engine-manager";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const { action } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason : undefined;
  const actor = { id: viewer.id, email: viewer.email, role: viewer.appRole };
  const opts = { actor, reason };

  let result;
  switch (action) {
    case "restart":
      result = await restartExecutionEngine(opts);
      break;
    case "reload-config":
      result = await reloadExecutionConfig(opts);
      break;
    case "set-mode": {
      const mode = typeof body?.mode === "string" ? body.mode : "";
      result = await setExecutionMode({ ...opts, mode });
      break;
    }
    default:
      return NextResponse.json(
        { ok: false, engine: "execution", action, errorCode: "UNKNOWN_ACTION", message: `Unknown execution action: ${action}` },
        { status: 400 },
      );
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
