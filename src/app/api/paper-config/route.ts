import { disabledPublicRoute } from "@/lib/signals/disabled-surface";

export const dynamic = "force-dynamic";

export async function GET() {
  return disabledPublicRoute("Paper trading configuration has been removed from the public product.");
}

export async function POST() {
  return disabledPublicRoute("Paper trading configuration has been removed from the public product.");
}
