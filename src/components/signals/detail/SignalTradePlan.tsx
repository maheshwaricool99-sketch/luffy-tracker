import type { SignalDrawerDto } from "@/lib/signals/types/signalDtos";
import { LockedField } from "../shared/LockedValue";

function formatPrice(price: number): string {
  if (price < 1) return `$${price.toFixed(5)}`;
  if (price < 100) return `$${price.toFixed(3)}`;
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SignalTradePlan({ signal }: { signal: SignalDrawerDto }) {
  const locked = signal.isPremiumLocked;
  const plan = signal.tradePlan;
  const entry = signal.entry;
  const stopLoss = signal.stopLoss;
  const targets = signal.targets;

  const entryValue =
    entry?.min != null && entry.max != null
      ? `${formatPrice(entry.min)} – ${formatPrice(entry.max)}`
      : entry?.min != null
      ? formatPrice(entry.min)
      : plan?.entryMin != null && plan.entryMax != null
      ? `${formatPrice(plan.entryMin)} – ${formatPrice(plan.entryMax)}`
      : plan?.entryMin != null
      ? formatPrice(plan.entryMin)
      : "—";

  const slValue = stopLoss?.value != null
    ? formatPrice(stopLoss.value)
    : plan?.stopLoss != null
    ? formatPrice(plan.stopLoss)
    : "—";

  const tp1Value = targets?.tp1 != null ? formatPrice(targets.tp1) : plan?.takeProfit1 != null ? formatPrice(plan.takeProfit1) : "—";
  const tp2Value = targets?.tp2 != null ? formatPrice(targets.tp2) : plan?.takeProfit2 != null ? formatPrice(plan.takeProfit2) : null;
  const tp3Value = targets?.tp3 != null ? formatPrice(targets.tp3) : plan?.takeProfit3 != null ? formatPrice(plan.takeProfit3) : null;
  const rrValue = plan?.riskRewardRatio != null ? `${plan.riskRewardRatio.toFixed(2)}R` : null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0B1728] p-4 md:p-5">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#70809A]">Trade Plan</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <LockedField label="Entry Zone" value={entryValue} locked={locked} teaser="Premium" />
        <LockedField label="Stop Loss" value={<span className="text-rose-400">{slValue}</span>} locked={locked} teaser="Premium" />
        <LockedField label="Target 1" value={<span className="text-emerald-400">{tp1Value}</span>} locked={locked} teaser="Premium" />
        {tp2Value && (
          <LockedField label="Target 2" value={<span className="text-emerald-400">{tp2Value}</span>} locked={locked} teaser="Premium" />
        )}
        {tp3Value && (
          <LockedField label="Stretch Target" value={<span className="text-emerald-400">{tp3Value}</span>} locked={locked} teaser="Premium" />
        )}
        {rrValue && (
          <LockedField label="Risk / Reward" value={rrValue} locked={locked} teaser="Premium" />
        )}
        {signal.timeframe && (
          <LockedField label="Horizon" value={signal.timeframe} locked={false} />
        )}
        {plan?.invalidationCondition && (
          <div className="col-span-2 sm:col-span-3">
            <LockedField label="Invalidation" value={plan.invalidationCondition} locked={locked} teaser="Premium" />
          </div>
        )}
      </div>
      {locked && (
        <p className="mt-3 text-[12px] text-amber-400/80">
          Upgrade to Premium to unlock entry zones, stop loss, and all targets.
        </p>
      )}
    </div>
  );
}
