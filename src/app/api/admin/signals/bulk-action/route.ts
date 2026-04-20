import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";
import { invalidateSignal } from "@/lib/signals/commands/invalidateSignal";
import { publishSignal } from "@/lib/signals/commands/publishSignal";
import { unpublishSignal } from "@/lib/signals/commands/unpublishSignal";
import { toRuntimeErrorResponse } from "@/lib/runtime";

export async function POST(request: Request) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const user = gate;
  const body = await request.json();
  const ids = Array.isArray(body.ids) ? body.ids as string[] : [];
  const results = [];
  for (const id of ids) {
    try {
      if (body.action === "publish") results.push(await publishSignal(id, user.id, String(body.reason ?? ""), Boolean(body.force)));
      else if (body.action === "unpublish") results.push(await unpublishSignal(id, user.id, String(body.reason ?? "")));
      else if (body.action === "invalidate") results.push(await invalidateSignal(id, user.id, String(body.reason ?? "")));
    } catch (error) {
      const runtimeError = toRuntimeErrorResponse(error);
      results.push({ ok: false, signalId: id, error: runtimeError ? runtimeError.body.error.message : error instanceof Error ? error.message : "failed" });
    }
  }
  return Response.json({ ok: true, results });
}
