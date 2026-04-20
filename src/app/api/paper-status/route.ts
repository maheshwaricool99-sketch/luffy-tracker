import { disabledPublicRoute } from "@/lib/signals/disabled-surface";

export const dynamic = "force-dynamic";

export async function GET() {
  return disabledPublicRoute("Paper trading status has been removed from the public product.");
}
