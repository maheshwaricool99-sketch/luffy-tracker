"use client";

import { useEffect } from "react";
import type { SignalDrawerDto } from "@/lib/signals/types/signalDtos";
import { SignalHero } from "./SignalHero";
import { SignalTradePlan } from "./SignalTradePlan";
import { SignalReasonStack } from "./SignalReasonStack";
import { SignalMarketContext } from "./SignalMarketContext";
import { SignalIntegrityPanel } from "./SignalIntegrityPanel";
import { SignalLifecycleTimeline } from "./SignalLifecycleTimeline";
import { SignalActions } from "./SignalActions";
import { UpsellBanner } from "./UpsellBanner";

export function SignalDetailSheet({
  signal,
  role = "GUEST",
  loading,
  onClose,
}: {
  signal: SignalDrawerDto | null;
  role?: string;
  loading: boolean;
  onClose: () => void;
}) {
  const showUpsell = role === "GUEST" || role === "FREE";
  const open = !!signal || loading;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#06111F]">
      {/* Header */}
      <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
        <span className="text-[14px] font-semibold text-[#F3F7FF]">
          {signal ? `${signal.symbol} · ${signal.direction}` : "Loading…"}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-[#70809A] transition-colors hover:text-[#A7B4C8]"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl border border-white/[0.06] bg-[#0B1728]" />
            ))}
          </div>
        ) : signal ? (
          <div className="space-y-3 p-4 pb-10">
            <SignalHero signal={signal} />
            <SignalTradePlan signal={signal} />
            {showUpsell && <UpsellBanner role={role} />}
            <SignalReasonStack signal={signal} />
            <SignalMarketContext signal={signal} />
            <SignalIntegrityPanel signal={signal} />
            <SignalLifecycleTimeline signal={signal} />
            <SignalActions signal={signal} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
