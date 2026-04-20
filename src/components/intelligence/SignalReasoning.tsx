import type { ReasoningBullet } from "@/lib/intelligence/types";

const TAG_COLORS: Record<string, string> = {
  Structure:          "border-sky-400/30 bg-sky-400/10 text-sky-300",
  Volume:             "border-violet-400/30 bg-violet-400/10 text-violet-300",
  Trend:              "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  Flow:               "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  Momentum:           "border-amber-400/30 bg-amber-400/10 text-amber-300",
  Regime:             "border-indigo-400/30 bg-indigo-400/10 text-indigo-300",
  "Relative Strength":"border-teal-400/30 bg-teal-400/10 text-teal-300",
  Pattern:            "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-300",
  Catalyst:           "border-amber-500/30 bg-amber-500/10 text-amber-200",
  Derivatives:        "border-rose-400/30 bg-rose-400/10 text-rose-300",
  Liquidity:          "border-sky-300/25 bg-sky-300/8 text-sky-300",
  Confirmation:       "border-emerald-300/20 bg-emerald-300/8 text-emerald-300",
};

function BulletTag({ tag }: { tag: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${TAG_COLORS[tag] ?? "border-white/10 bg-white/5 text-[#70809A]"}`}>
      {tag}
    </span>
  );
}

interface SignalReasoningProps {
  bullets: ReasoningBullet[];
  isPremiumLocked: boolean;
}

export function SignalReasoning({ bullets, isPremiumLocked }: SignalReasoningProps) {
  if (isPremiumLocked) {
    return (
      <div className="px-4 py-3 border-b border-white/[0.05]">
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#70809A]">Signal Basis</div>
        <div className="text-[12px] text-[#70809A] italic">
          Multi-factor analysis — full reasoning unlocked with Premium
        </div>
      </div>
    );
  }

  if (bullets.length === 0) return null;

  const positive = bullets.filter((b) => b.positive);
  const negative = bullets.filter((b) => !b.positive);

  return (
    <div className="px-4 py-3 border-b border-white/[0.05]">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#70809A]">Signal Basis</div>
      <div className="space-y-1.5">
        {positive.map((bullet, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-[3px] shrink-0 text-emerald-400 text-[10px]">✓</span>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <BulletTag tag={bullet.tag} />
              <span className="text-[12px] leading-snug text-[#A7B4C8]">{bullet.text}</span>
            </div>
          </div>
        ))}
        {negative.map((bullet, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-[3px] shrink-0 text-amber-400 text-[10px]">△</span>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <BulletTag tag={bullet.tag} />
              <span className="text-[12px] leading-snug text-[#A7B4C8]">{bullet.text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
