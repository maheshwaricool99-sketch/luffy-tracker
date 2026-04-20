import { StatusChip } from "@/components/primitives/StatusChip";
import type { ScannerDataState } from "@/lib/scanner/types";

export function FreshnessBadge({ state }: { state: ScannerDataState }) {
  if (state === "live") return <StatusChip label="Live" tone="green" />;
  if (state === "delayed") return <StatusChip label="Delayed" tone="yellow" />;
  if (state === "cached") return <StatusChip label="Cached" tone="blue" />;
  if (state === "restored_snapshot") return <StatusChip label="Restored Snapshot" tone="blue" />;
  if (state === "stale") return <StatusChip label="Stale" tone="red" />;
  return <StatusChip label="Unavailable" tone="red" />;
}
