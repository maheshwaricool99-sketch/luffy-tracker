import { getSessionUser } from "@/lib/auth/getSessionUser";
import { getSignalsPulse } from "@/lib/signals/queries/getSignalsPulse";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  const role = user?.appRole ?? "GUEST";
  return Response.json(await getSignalsPulse(role), { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" } });
}
