import { getSessionUser } from "@/lib/auth/getSessionUser";
import { getHealthSnapshot } from "@/lib/health/health-aggregator";
import { jsonError } from "@/lib/http/response";
import { getPlatformHealthStatus } from "@/lib/market-data/health/platform-health";
import { getRecoveryController } from "@/lib/market-data/recovery/recovery-controller";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getSessionUser();
  if (!viewer || viewer.accountStatus !== "ACTIVE") {
    return jsonError(401, "UNAUTHENTICATED", "Authentication required.");
  }

  try {
    getRecoveryController();
    const data = await getHealthSnapshot();
    return Response.json({
      ...data,
      platform: getPlatformHealthStatus(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[/api/health] aggregation error:", err);
    return Response.json(
      { error: "Health aggregation failed", status: "down" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
