import { getSignalsSnapshot } from "@/lib/signals/signal-engine";
import { projectWhaleRows } from "@/lib/signals/terminal-projections";

export const dynamic = "force-dynamic";

export async function GET() {
  const signals = await getSignalsSnapshot("crypto");
  return Response.json(
    {
      terminal: true,
      marketId: "crypto",
      rows: projectWhaleRows(signals),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
