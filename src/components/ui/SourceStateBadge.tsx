import { StatusChip } from "@/components/primitives/StatusChip";
import type { SourceState } from "@/lib/freshness";

export function SourceStateBadge({ state }: { state: SourceState }) {
  const tone = state === "LIVE_PROVIDER" ? "green" : state === "DELAYED_FEED" ? "yellow" : "blue";
  return <StatusChip label={state.replaceAll("_", " ")} tone={tone} />;
}
