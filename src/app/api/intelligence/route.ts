import { getViewer } from "@/lib/auth";
import { getIntelligencePagePayload } from "@/lib/intelligence/adapter";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getViewer();
  const payload = await getIntelligencePagePayload(viewer);
  return Response.json(payload, {
    headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" },
  });
}
