import { disabledPublicRoute } from "@/lib/signals/disabled-surface";

export async function POST() {
  return disabledPublicRoute("Portfolio administration has been removed from the public product.");
}
