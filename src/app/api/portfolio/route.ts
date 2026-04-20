import { disabledPublicRoute } from "@/lib/signals/disabled-surface";

export const dynamic = "force-dynamic";

export async function GET() {
  return disabledPublicRoute("Portfolio and execution surfaces have been removed from the public product.");
}
