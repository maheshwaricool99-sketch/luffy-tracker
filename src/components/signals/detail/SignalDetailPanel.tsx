import type { SignalDrawerDto } from "@/lib/signals/types/signalDtos";
import { SignalHero } from "./SignalHero";
import { SignalTradePlan } from "./SignalTradePlan";
import { SignalReasonStack } from "./SignalReasonStack";
import { SignalMarketContext } from "./SignalMarketContext";
import { SignalIntegrityPanel } from "./SignalIntegrityPanel";
import { SignalLifecycleTimeline } from "./SignalLifecycleTimeline";
import { SignalActions } from "./SignalActions";
import { UpsellBanner } from "./UpsellBanner";

function EmptyState() {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.06] bg-[#0B1728] p-8 text-center">
      <div className="text-3xl opacity-40">📊</div>
      <p className="text-[14px] font-medium text-[#A7B4C8]">Select a signal</p>
      <p className="text-[12px] text-[#4A5568]">Click any signal card to inspect the full trade plan and analysis.</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl border border-white/[0.06] bg-[#0B1728]" />
      ))}
    </div>
  );
}

export function SignalDetailPanel({
  signal,
  role = "GUEST",
  loading = false,
}: {
  signal: SignalDrawerDto | null;
  role?: string;
  loading?: boolean;
}) {
  const showUpsell = role === "GUEST" || role === "FREE";
  return (
    <div className="sticky top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10">
      {loading ? (
        <LoadingState />
      ) : !signal ? (
        <EmptyState />
      ) : (
        <div className="space-y-3 pb-8">
          <SignalHero signal={signal} />
          <SignalTradePlan signal={signal} />
          {showUpsell && <UpsellBanner role={role} />}
          <SignalReasonStack signal={signal} />
          <SignalMarketContext signal={signal} />
          <SignalIntegrityPanel signal={signal} />
          <SignalLifecycleTimeline signal={signal} />
          <SignalActions signal={signal} />
        </div>
      )}
    </div>
  );
}
