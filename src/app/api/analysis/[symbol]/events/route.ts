import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { getAnalysisEntitlements } from "@/lib/analysis/access";
import { detectMarket } from "@/lib/analysis/market-router";
import { buildMockAnalysis } from "@/lib/analysis/mock";
import { serializeAnalysisForEntitlements } from "@/lib/analysis/serializer";
import { parseSymbol, parseTimeframe } from "@/lib/analysis/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ symbol: string }> }) {
  const { symbol: rawSymbol } = await context.params;
  const symbolResult = parseSymbol(rawSymbol);
  if (!symbolResult.success) {
    return NextResponse.json({ error: "Invalid symbol", code: "INVALID_SYMBOL" }, { status: 400 });
  }

  const timeframeResult = parseTimeframe(request.nextUrl.searchParams.get("timeframe") ?? "1H");
  if (!timeframeResult.success) {
    return NextResponse.json({ error: "Invalid timeframe", code: "INVALID_TIMEFRAME" }, { status: 400 });
  }

  const market = detectMarket(symbolResult.data);
  if (!market) {
    return NextResponse.json({ error: "Unsupported market", code: "UNSUPPORTED_MARKET" }, { status: 404 });
  }

  const viewer = await getSessionUser();
  const entitlements = getAnalysisEntitlements(viewer);
  const payload = await buildMockAnalysis(symbolResult.data, market, timeframeResult.data, entitlements);
  const masked = serializeAnalysisForEntitlements(payload, entitlements);

  return NextResponse.json({ events: masked.events }, { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=45" } });
}
