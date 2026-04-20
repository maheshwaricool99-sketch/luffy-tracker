import { getRecoveryController } from "@/lib/market-data/recovery/recovery-controller";
import { getPlatformHealthStatus } from "@/lib/market-data/health/platform-health";

export const dynamic = "force-dynamic";

export async function GET() {
  getRecoveryController();
  return Response.json(getPlatformHealthStatus(), { headers: { "Cache-Control": "no-store" } });
}
