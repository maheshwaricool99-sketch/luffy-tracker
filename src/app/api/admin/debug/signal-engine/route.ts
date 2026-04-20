import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/requireAdminApi";
import { getDecisionLog } from "@/lib/audit/decision-log";
import { runSignalEngine } from "@/lib/signals/signal-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const engineResult = await runSignalEngine(true).catch((err) => ({ error: String(err?.message ?? err) }));
  const log = getDecisionLog().slice(-200);
  const byReason = log.reduce<Record<string, number>>((acc, entry) => {
    const key = `${entry.stage}:${entry.reason}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  return NextResponse.json({
    ok: true,
    engineResult,
    decisionCount: log.length,
    byReason,
    recent: log.slice(-40),
  });
}
