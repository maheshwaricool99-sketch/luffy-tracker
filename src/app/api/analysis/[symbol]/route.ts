import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { getAnalysisEntitlements } from "@/lib/analysis/access";
import { ANALYSIS_CACHE_SECONDS, ANALYSIS_MODEL_VERSION, ANALYSIS_STALE_WHILE_REVALIDATE_SECONDS, ANALYSIS_VERSION } from "@/lib/analysis/constants";
import { detectMarket } from "@/lib/analysis/market-router";
import { buildMockAnalysis } from "@/lib/analysis/mock";
import { serializeAnalysisForEntitlements } from "@/lib/analysis/serializer";
import { parseSymbol, parseTimeframe } from "@/lib/analysis/validation";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ symbol: string }> },
) {
  const { symbol: rawSymbol } = await context.params;
  const symbolResult = parseSymbol(rawSymbol);
  if (!symbolResult.success) {
    return NextResponse.json({ error: "Invalid symbol", code: "INVALID_SYMBOL" }, { status: 400 });
  }

  const timeframeResult = parseTimeframe(request.nextUrl.searchParams.get("timeframe") ?? "1H");
  if (!timeframeResult.success) {
    return NextResponse.json({ error: "Invalid timeframe", code: "INVALID_TIMEFRAME" }, { status: 400 });
  }

  const symbol = symbolResult.data;
  const timeframe = timeframeResult.data;
  const market = detectMarket(symbol);
  if (!market) {
    return NextResponse.json({ error: "Unsupported market", code: "UNSUPPORTED_MARKET" }, { status: 404 });
  }

  const viewer = await getSessionUser();
  const entitlements = getAnalysisEntitlements(viewer);

  try {
    const payload = await buildMockAnalysis(symbol, market, timeframe, entitlements);
    const masked = serializeAnalysisForEntitlements(payload, entitlements);

    return NextResponse.json(masked, {
      headers: {
        "Cache-Control": `private, max-age=${ANALYSIS_CACHE_SECONDS}, stale-while-revalidate=${ANALYSIS_STALE_WHILE_REVALIDATE_SECONDS}`,
        "X-Analysis-Version": ANALYSIS_VERSION,
        "X-Model-Version": ANALYSIS_MODEL_VERSION,
      },
    });
  } catch (error) {
    console.error("[/api/analysis/:symbol] failed", { symbol, timeframe, error });
    return NextResponse.json({ error: "Analysis unavailable", code: "UPSTREAM_UNAVAILABLE" }, { status: 503 });
  }
}
