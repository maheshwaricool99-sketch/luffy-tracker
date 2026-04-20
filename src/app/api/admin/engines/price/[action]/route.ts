import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";
import {
  flushPriceCache,
  reconnectPriceProviders,
  reloadPriceProviders,
  restartPriceEngine,
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
      result = await restartPriceEngine(opts);
      break;
    case "reconnect":
      result = await reconnectPriceProviders(opts);
      break;
    case "reload-providers":
      result = await reloadPriceProviders(opts);
      break;
    case "flush-cache":
      result = await flushPriceCache(opts);
      break;
    default:
      return NextResponse.json(
        { ok: false, engine: "price", action, errorCode: "UNKNOWN_ACTION", message: `Unknown price action: ${action}` },
        { status: 400 },
      );
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
