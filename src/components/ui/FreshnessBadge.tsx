import { StatusChip } from "@/components/primitives/StatusChip";
import type { Freshness } from "@/lib/freshness";

export function FreshnessBadge({ freshness }: { freshness: Freshness }) {
  const tone =
    freshness === "LIVE" ? "green" :
    freshness === "DELAYED" ? "yellow" :
    freshness === "RESTORED_SNAPSHOT" || freshness === "CACHED" ? "blue" :
    "red";

  return <StatusChip label={freshness.replaceAll("_", " ")} tone={tone} />;
}
