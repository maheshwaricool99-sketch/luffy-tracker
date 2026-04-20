import { getSignalsSnapshot } from "@/lib/signals/signal-engine";
import { projectCatalystRows } from "@/lib/signals/terminal-projections";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const assetType = searchParams.get("assetType");
  const market =
    assetType === "crypto" ? "crypto"
      : assetType === "stocks" ? undefined
      : undefined;
  const signals = await getSignalsSnapshot(market);
  const rows = projectCatalystRows(signals);
  return Response.json(
    {
      terminal: true,
      timestamp: Date.now(),
      totalCandidates: rows.length,
      topSignals: rows.slice(0, 25),
      recentSignals: rows,
      warnings: rows.length === 0 ? ["No publishable catalyst intelligence at current integrity threshold."] : [],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
