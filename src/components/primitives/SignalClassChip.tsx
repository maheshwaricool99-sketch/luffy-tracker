import { StatusChip } from "./StatusChip";

export function SignalClassChip({ signalClass }: { signalClass: "elite" | "strong" | "watchlist" }) {
  if (signalClass === "elite") return <StatusChip label="Elite" tone="green" />;
  if (signalClass === "strong") return <StatusChip label="Strong" tone="blue" />;
  return <StatusChip label="Watchlist" tone="yellow" />;
}
