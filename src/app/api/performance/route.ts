import { getViewer } from "@/lib/auth";
import { getPerformancePayload } from "@/lib/performance/query";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const viewer = await getViewer();
    const { searchParams } = new URL(request.url);
    const payload = await getPerformancePayload(viewer, searchParams);
    return Response.json(payload, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return Response.json({
      error: "Unable to load performance data",
      meta: {
        dataState: "ERROR",
      },
    }, { status: 500 });
  }
}
