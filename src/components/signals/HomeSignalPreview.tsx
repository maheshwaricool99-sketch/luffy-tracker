import { FreshnessBadge } from "@/components/ui/FreshnessBadge";
import type { SignalListItemDto } from "@/lib/signals/types/signalDtos";

type SignalPreview = Pick<SignalListItemDto, "id" | "symbol" | "direction" | "market" | "timeframe" | "confidenceBucket" | "freshness" | "isPremiumLocked">;

export function HomeSignalPreview({ signals }: { signals: SignalPreview[] }) {
  return (
    <div className="mt-5 grid gap-3">
      {signals.length > 0 ? signals.map((signal) => (
        <div
          key={signal.id}
          className={`rounded-2xl border border-white/[0.06] bg-[#0F1D31] px-4 py-3 text-[13px] text-[#A7B4C8] ${signal.isPremiumLocked ? "opacity-70" : ""}`}
        >
          <div className="flex items-start justify-between gap-3 md:hidden">
            <div>
              <div className="font-semibold text-[#F3F7FF]">{signal.symbol}</div>
              <div className="mt-1 text-[12px] text-[#70809A]">{signal.market} · {signal.timeframe}</div>
            </div>
            <FreshnessBadge freshness={signal.freshness.badge === "FRESH" ? "LIVE" : signal.freshness.badge === "AGING" ? "DELAYED" : "STALE"} />
          </div>
          <div className="mt-3 grid gap-2 md:hidden">
            <div className="flex items-center justify-between">
              <span className="text-[#70809A]">Direction</span>
              <span>{signal.direction}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#70809A]">Access</span>
              <span>{signal.isPremiumLocked ? "Delayed preview" : signal.confidenceBucket}</span>
            </div>
          </div>
          <div className="hidden md:grid md:grid-cols-[1.1fr,0.8fr,0.8fr,0.9fr,1fr] md:gap-3">
            <span className="font-semibold text-[#F3F7FF]">{signal.symbol}</span>
            <span>{signal.direction}</span>
            <span>{signal.market} · {signal.timeframe}</span>
            <FreshnessBadge freshness={signal.freshness.badge === "FRESH" ? "LIVE" : signal.freshness.badge === "AGING" ? "DELAYED" : "STALE"} />
            <span>{signal.isPremiumLocked ? "Delayed preview" : signal.confidenceBucket}</span>
          </div>
        </div>
      )) : <div className="text-[13px] text-[#70809A]">No public signals available.</div>}
    </div>
  );
}
