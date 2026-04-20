import { isMarketSessionOpen } from "@/lib/validation/market-session-validator";
import { getSignalsSnapshot } from "@/lib/signals/signal-engine";
import { projectIndiaRows } from "@/lib/signals/terminal-projections";

export const dynamic = "force-dynamic";

export async function GET() {
  const signals = await getSignalsSnapshot("india");
  return Response.json(
    {
      terminal: true,
      marketId: "india",
      marketOpen: isMarketSessionOpen("india").open,
      rows: projectIndiaRows(signals),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
