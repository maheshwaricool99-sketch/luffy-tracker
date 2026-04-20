import type { MarketScannerSnapshot } from "@/lib/scanner/types";

const labels = {
  phase_1_core: "Phase 1",
  phase_2_priority: "Phase 2",
  phase_3_extended: "Phase 3",
  phase_4_full: "Phase 4",
} as const;

export function WarmupPhaseBar({ scanner }: { scanner: MarketScannerSnapshot }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[12px] font-medium text-[#A7B4C8]">
        <span>{labels[scanner.warmupPhase]} Warm-Up</span>
        <span>{scanner.warmupCompletePct}% complete</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.05]">
        <div className="h-2 rounded-full bg-[#5B8CFF]" style={{ width: `${scanner.warmupCompletePct}%` }} />
      </div>
    </div>
  );
}
