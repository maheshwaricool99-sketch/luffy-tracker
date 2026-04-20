import { StatusChip } from "@/components/primitives/StatusChip";

export function HealthBadge({ healthy, label }: { healthy: boolean; label: string }) {
  return <StatusChip label={label} tone={healthy ? "green" : "red"} />;
}
