import Link from "next/link";
import type { IntelligenceTradePlan } from "@/lib/intelligence/types";
import { RiskBadge, ActionabilityBadge } from "./SignalBadges";

function fmt(v: number | null, decimals = 2) {
  if (v === null) return null;
  return v < 1 ? v.toFixed(5) : v < 100 ? v.toFixed(4) : v.toFixed(decimals);
}

function PriceRow({ label, value, accent }: { label: string; value: string | null; accent?: "target" | "stop" | "entry" }) {
  const color = accent === "target" ? "text-emerald-300" : accent === "stop" ? "text-rose-300" : "text-[#F3F7FF]";
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-[11px] text-[#70809A]">{label}</span>
      <span className={`text-[12px] font-semibold tabular-nums ${color}`}>{value ?? "—"}</span>
    </div>
  );
}

function RRBar({ rr }: { rr: number }) {
  const pct = Math.min(100, (rr / 5) * 100);
  const color = rr >= 3 ? "bg-emerald-400" : rr >= 2 ? "bg-sky-400" : rr >= 1.5 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] font-bold tabular-nums text-[#F3F7FF]">1 : {rr.toFixed(1)}</span>
    </div>
  );
}

interface SignalTradePlanProps {
  plan: IntelligenceTradePlan;
  symbol: string;
  currentPrice: number;
}

export function SignalTradePlan({ plan, symbol: _symbol, currentPrice: _currentPrice }: SignalTradePlanProps) {
  if (plan.locked) {
    return (
      <div className="px-4 py-4 border-b border-white/[0.05]">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#70809A]">Trade Plan</div>
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center">
          <div className="text-[13px] font-semibold text-[#F3F7FF]">Full trade plan locked</div>
          <div className="mt-1 text-[12px] text-[#70809A]">Entry zone, stop loss, and all targets are premium-only</div>
          <Link
            href="/pricing"
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#5B8CFF]/40 bg-[#5B8CFF]/15 px-4 py-2 text-[13px] font-semibold text-[#F3F7FF] hover:bg-[#5B8CFF]/25 transition-colors"
          >
            Unlock Trade Plan — Upgrade
          </Link>
        </div>
      </div>
    );
  }

  const entryStr = plan.entryMin && plan.entryMax
    ? `$${fmt(plan.entryMin)} – $${fmt(plan.entryMax)}`
    : plan.entryMin ? `$${fmt(plan.entryMin)}` : null;

  return (
    <div className="px-4 py-3 border-b border-white/[0.05]">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#70809A]">Trade Plan</span>
        <div className="flex items-center gap-1.5">
          <ActionabilityBadge actionability={plan.isExtended ? "TOO_EXTENDED" : "READY_NOW"} />
          <RiskBadge grade={plan.riskGrade} />
        </div>
      </div>

      {plan.isExtended && (
        <div className="mb-2.5 flex items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-400/8 px-3 py-2 text-[11px] text-amber-300">
          <span>⚠</span>
          <span>Entry zone extended — chasing risk elevated. Wait for retest.</span>
        </div>
      )}

      <div className="space-y-0.5 mb-3">
        <PriceRow label="Entry Zone" value={entryStr} accent="entry" />
        {plan.triggerCondition && (
          <div className="py-0.5">
            <span className="text-[11px] text-[#70809A]">Trigger</span>
            <p className="mt-0.5 text-[11px] text-[#A7B4C8]">{plan.triggerCondition}</p>
          </div>
        )}
        <PriceRow label="Stop Loss" value={plan.stopLoss !== null ? `$${fmt(plan.stopLoss)}` : null} accent="stop" />
        <PriceRow label="TP1" value={plan.tp1 !== null ? `$${fmt(plan.tp1)}` : null} accent="target" />
        <PriceRow label="TP2" value={plan.tp2 !== null ? `$${fmt(plan.tp2)}` : null} accent="target" />
        {plan.tp3 !== null && <PriceRow label="TP3" value={`$${fmt(plan.tp3)}`} accent="target" />}
      </div>

      <div className="mb-2.5">
        <div className="mb-1 text-[10px] text-[#70809A]">Risk / Reward</div>
        {plan.riskReward !== null ? <RRBar rr={plan.riskReward} /> : <span className="text-[12px] text-[#70809A]">—</span>}
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        <div className="flex justify-between gap-1 rounded-lg bg-white/[0.03] px-2 py-1.5">
          <span className="text-[#70809A]">Timeframe</span>
          <span className="font-medium text-[#A7B4C8]">{plan.timeframe}</span>
        </div>
        <div className="flex justify-between gap-1 rounded-lg bg-white/[0.03] px-2 py-1.5">
          <span className="text-[#70809A]">Style</span>
          <span className="font-medium text-[#A7B4C8]">{plan.tradeStyle}</span>
        </div>
        {plan.estimatedHold && (
          <div className="flex justify-between gap-1 rounded-lg bg-white/[0.03] px-2 py-1.5">
            <span className="text-[#70809A]">Est. Hold</span>
            <span className="font-medium text-[#A7B4C8]">{plan.estimatedHold}</span>
          </div>
        )}
      </div>

      {plan.invalidationRule && (
        <div className="mt-2.5 rounded-lg border border-rose-400/15 bg-rose-400/5 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-rose-400/70">Invalidation</div>
          <div className="mt-0.5 text-[11px] text-[#A7B4C8]">{plan.invalidationRule}</div>
        </div>
      )}
    </div>
  );
}
