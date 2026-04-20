import { getSnapshot } from "@/lib/market-snapshot/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = getSnapshot();
  return Response.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}
