import type { TradeBlockerSummary } from "@/lib/health/health-types";
import { HealthStatusPill } from "./HealthStatusPill";

export function TradeBlockersCard({ blockers }: { blockers: TradeBlockerSummary }) {
  const slotsFull = blockers.openPositions >= blockers.maxTradeSlots;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0B1728] p-5 md:p-6">
      <div className="mb-4">
        <h2 className="text-[16px] font-semibold text-[#F3F7FF]">Why No Trades Right Now</h2>
        <p className="mt-0.5 text-[12px] text-[#70809A]">Explains current signal and execution state</p>
      </div>

      {/* Slot visualization */}
      <div className="mb-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center justify-between text-[12px]">
          <span className="text-[#A7B4C8]">Active trade slots</span>
          <span className="tabular-nums text-[#F3F7FF] font-semibold">
            {blockers.openPositions} / {blockers.maxTradeSlots}
          </span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: blockers.maxTradeSlots }, (_, i) => (
            <div
              key={i}
              className={`h-3 flex-1 rounded-sm ${
                i < blockers.openPositions
                  ? "bg-[#5B8CFF]/60"
                  : "bg-white/[0.06]"
              }`}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-[#70809A]">
          <span>{blockers.remainingSlots} slot{blockers.remainingSlots !== 1 ? "s" : ""} remaining</span>
          {blockers.replacementState && <span>{blockers.replacementState}</span>}
        </div>
        {slotsFull && (
          <p className="mt-2 text-[12px] text-amber-400">
            All slots filled — new entries paused until positions close.
          </p>
        )}
      </div>

      {/* Blocker list */}
      <div className="space-y-3">
        {blockers.blockers.map((blocker) => (
          <BlockerItem key={blocker.code} blocker={blocker} />
        ))}
      </div>
    </div>
  );
}

function BlockerItem({ blocker }: { blocker: { code: string; title: string; description: string; severity: string } }) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
      <div className="mt-0.5 flex-shrink-0">
        <HealthStatusPill status={blocker.severity} size="xs" showDot label="" className="!px-0 !py-0 border-0 bg-transparent" />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[#F3F7FF]">{blocker.title}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-[#70809A]">{blocker.description}</p>
      </div>
      <div className="flex-shrink-0">
        <HealthStatusPill status={blocker.severity} size="xs" showDot={false} />
      </div>
    </div>
  );
}
