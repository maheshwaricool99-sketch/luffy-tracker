import { FreshnessBadge } from "./FreshnessBadge";
import { HealthBadge } from "./HealthBadge";
import { Panel } from "@/components/primitives/Panel";
import { WarmupPhaseBar } from "./WarmupPhaseBar";
import type { MarketScannerSnapshot } from "@/lib/scanner/types";

export function ScannerCoverageCard({ scanner }: { scanner: MarketScannerSnapshot }) {
  return (
    <Panel title={scanner.market.toUpperCase()} subtitle="Coverage, freshness, and degraded-state profile." bodyClassName="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <HealthBadge healthy={!scanner.degradedMode} label={scanner.degradedMode ? "Degraded" : "Stable"} />
        <FreshnessBadge state={scanner.dataState} />
      </div>
      <WarmupPhaseBar scanner={scanner} />
      <div className="grid grid-cols-2 gap-3 text-[12px] font-medium text-[#A7B4C8]">
        <div>Coverage <span className="float-right text-[#F3F7FF]">{scanner.coveragePct}%</span></div>
        <div>Skipped <span className="float-right text-[#F3F7FF]">{scanner.skippedCount}</span></div>
        <div>Live <span className="float-right text-[#F3F7FF]">{scanner.liveCount}</span></div>
        <div>Cached <span className="float-right text-[#F3F7FF]">{scanner.cachedCount}</span></div>
        <div>Restored <span className="float-right text-[#F3F7FF]">{scanner.restoredCount}</span></div>
        <div>Scan ms <span className="float-right text-[#F3F7FF]">{scanner.scanDurationMs}</span></div>
      </div>
    </Panel>
  );
}
