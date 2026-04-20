import type { SignalDrawerDto } from "@/lib/signals/types/signalDtos";
import { cn } from "@/lib/cn";

const MARKET_LABELS: Record<string, string> = {
  CRYPTO: "Crypto",
  US: "US Equities",
  INDIA: "India Equities",
};

const BIAS_CONFIG = {
  BULLISH: { label: "Bullish", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  BEARISH: { label: "Bearish", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
  NEUTRAL: { label: "Neutral", color: "text-[#A7B4C8]", bg: "bg-white/[0.04] border-white/[0.08]" },
};

const VOL_CONFIG = {
  LOW: { label: "Low Volatility", color: "text-emerald-400" },
  NORMAL: { label: "Normal Volatility", color: "text-[#A7B4C8]" },
  HIGH: { label: "High Volatility", color: "text-amber-400" },
};

function ContextChip({ label, sub, className }: { label: string; sub?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-0.5 rounded-xl border px-3 py-2", className)}>
      <span className="text-[10px] uppercase tracking-[0.08em] text-[#70809A]">{sub}</span>
      <span className="text-[13px] font-semibold">{label}</span>
    </div>
  );
}

export function SignalMarketContext({ signal }: { signal: SignalDrawerDto }) {
  const { market, marketBias, volatilityRegime } = signal;
  if (!marketBias && !volatilityRegime) return null;

  const biasConfig = marketBias ? BIAS_CONFIG[marketBias] : null;
  const volConfig = volatilityRegime ? VOL_CONFIG[volatilityRegime] : null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0B1728] p-4 md:p-5">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#70809A]">Market Context</h3>
      <div className="flex flex-wrap gap-2">
        <ContextChip
          label={MARKET_LABELS[market] ?? market}
          sub="Market"
          className="border-white/[0.08] text-[#A7B4C8]"
        />
        {biasConfig && (
          <ContextChip
            label={biasConfig.label}
            sub="Bias"
            className={cn(biasConfig.bg, biasConfig.color)}
          />
        )}
        {volConfig && (
          <ContextChip
            label={volConfig.label}
            sub="Regime"
            className={cn("border-white/[0.08]", volConfig.color)}
          />
        )}
      </div>
    </div>
  );
}
