import { getSignalsSnapshot } from "@/lib/signals/signal-engine";
import { projectPredictionRows } from "@/lib/signals/terminal-projections";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const marketId = searchParams.get("marketId");
  const market = marketId === "crypto" || marketId === "us" || marketId === "india" ? marketId : undefined;
  const signals = await getSignalsSnapshot(market);
  return Response.json(
    {
      terminal: true,
      marketId: market ?? "all",
      rows: projectPredictionRows(signals),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
