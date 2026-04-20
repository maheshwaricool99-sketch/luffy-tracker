"use client";

import { memo } from "react";
import type { IntelligenceSignal } from "@/lib/intelligence/types";
import { SignalCardShell } from "./SignalCardShell";
import { SignalHeader } from "./SignalHeader";
import { SignalContext } from "./SignalContext";
import { SignalTradePlan } from "./SignalTradePlan";
import { SignalReasoning } from "./SignalReasoning";
import { SignalStrategyBreakdown } from "./SignalStrategyBreakdown";
import { SignalTrustMeta } from "./SignalTrustMeta";
import { SignalTiming } from "./SignalTiming";
import { SignalMiniChart } from "./SignalMiniChart";
import { PremiumLockOverlay } from "./PremiumLockOverlay";

interface SignalCardProps {
  signal: IntelligenceSignal;
  selected?: boolean;
  isAdmin?: boolean;
  onSelect?: (id: string) => void;
  compact?: boolean;
}

function SignalCardComponent({ signal, selected, isAdmin, onSelect, compact }: SignalCardProps) {
  const isPremiumGrade = signal.qualityGrade === "ELITE" || signal.qualityGrade === "STRONG";

  return (
    <SignalCardShell
      direction={signal.direction}
      status={signal.status}
      integrityStatus={signal.feedMeta.integrityStatus}
      isPremiumGrade={isPremiumGrade}
      isAdminAdjusted={signal.adminAdjusted}
      isPremiumLocked={signal.isPremiumLocked}
      selected={selected}
      onClick={onSelect ? () => onSelect(signal.id) : undefined}
    >
      <SignalHeader signal={signal} />

      <SignalMiniChart signal={signal} />

      <SignalContext context={signal.marketContext} />

      {signal.isPremiumLocked ? (
        <PremiumLockOverlay
          symbol={signal.symbol}
          direction={signal.direction}
          teaserText={signal.teaserText}
        />
      ) : (
        <>
          <SignalTradePlan
            plan={signal.tradePlan}
            symbol={signal.symbol}
            currentPrice={signal.currentPrice}
          />
          <SignalReasoning
            bullets={signal.reasoningBullets}
            isPremiumLocked={signal.isPremiumLocked}
          />
          {!compact && (
            <SignalStrategyBreakdown
              contributions={signal.strategyContributions}
              isStrategyLocked={signal.isStrategyLocked}
            />
          )}
          <SignalTrustMeta meta={signal.feedMeta} />
        </>
      )}

      <SignalTiming
        generatedAt={signal.generatedAt}
        confirmedAt={signal.confirmedAt}
        status={signal.status}
        compact
      />

      {signal.historySimilarityStats && (
        <div className="px-4 pb-3">
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] px-3 py-2 text-[11px] text-[#70809A]">
            Based on similar setups:{" "}
            <span className="font-semibold text-[#A7B4C8]">
              {signal.historySimilarityStats.reachedTp1Pct}% reached TP1
            </span>{" "}
            ({signal.historySimilarityStats.sampleSize} samples)
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="px-4 pb-3 pt-1 border-t border-white/[0.04]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-[#70809A]">Admin:</span>
            {signal.adminPriority && <span className="text-[10px] text-violet-400">pinned</span>}
            {signal.premiumOnly && <span className="text-[10px] text-amber-400">premium-only</span>}
            <span className="text-[10px] text-[#70809A] font-mono">{signal.id.slice(0, 8)}</span>
          </div>
        </div>
      )}
    </SignalCardShell>
  );
}

export const SignalCard = memo(SignalCardComponent);
