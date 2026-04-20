import { getSignalsSnapshot } from "@/lib/signals/signal-engine";
import { projectLiquidationRows } from "@/lib/signals/terminal-projections";

export const dynamic = "force-dynamic";

export async function GET() {
  const signals = await getSignalsSnapshot("crypto");
  return Response.json(
    {
      terminal: true,
      marketId: "crypto",
      rows: projectLiquidationRows(signals),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
