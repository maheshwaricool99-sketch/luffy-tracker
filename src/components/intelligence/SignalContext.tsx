import type { IntelligenceMarketContext } from "@/lib/intelligence/types";

const REGIME_LABELS: Record<string, string> = {
  BULLISH: "Bullish", BEARISH: "Bearish", NEUTRAL: "Neutral",
  TRANSITION_BULLISH: "Neutral → Bullish Shift", TRANSITION_BEARISH: "Bearish Shift",
  EXPANSION: "Expansion", COMPRESSION: "Compression",
};

const VOL_LABELS: Record<string, string> = { LOW: "Low", NORMAL: "Normal", HIGH: "High" };

const VOL_COLOR: Record<string, string> = {
  LOW: "text-emerald-400", NORMAL: "text-[#A7B4C8]", HIGH: "text-amber-400",
};

function ContextRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-[#70809A]">{label}</span>
      <span className={`text-[11px] font-medium ${valueClass ?? "text-[#A7B4C8]"}`}>{value}</span>
    </div>
  );
}

export function SignalContext({ context }: { context: IntelligenceMarketContext }) {
  return (
    <div className="px-4 py-3 border-b border-white/[0.05]">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#70809A]">Market Context</div>
      <div className="space-y-1">
        <ContextRow label="Regime" value={REGIME_LABELS[context.regime] ?? context.regime} />
        <ContextRow
          label="Volatility"
          value={VOL_LABELS[context.volatilityRegime] ?? context.volatilityRegime}
          valueClass={VOL_COLOR[context.volatilityRegime]}
        />
        <ContextRow
          label="HTF Bias"
          value={context.htfBias}
          valueClass={context.htfBias === "BULLISH" ? "text-emerald-400" : context.htfBias === "BEARISH" ? "text-rose-400" : "text-[#A7B4C8]"}
        />
        {context.relativeStrength && (
          <ContextRow
            label="Rel. Strength"
            value={context.relativeStrength}
            valueClass={context.relativeStrength === "STRONG" ? "text-emerald-400" : context.relativeStrength === "WEAK" ? "text-rose-400" : "text-[#A7B4C8]"}
          />
        )}
        {context.sector && <ContextRow label="Sector" value={context.sector} />}
      </div>
    </div>
  );
}
