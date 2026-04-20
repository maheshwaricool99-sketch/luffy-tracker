import Link from "next/link";

interface PremiumLockOverlayProps {
  symbol: string;
  direction: string;
  teaserText?: string | null;
  variant?: "card" | "section";
}

export function PremiumLockOverlay({ symbol, direction, teaserText, variant = "card" }: PremiumLockOverlayProps) {
  if (variant === "section") {
    return (
      <div className="relative overflow-hidden rounded-xl border border-dashed border-[#5B8CFF]/25 bg-[#5B8CFF]/5 px-4 py-4">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#5B8CFF]/30 to-transparent" />
        <div className="text-[12px] font-semibold text-[#89A8FF]">Premium Feature</div>
        <div className="mt-1 text-[11px] text-[#70809A]">
          Full breakdown available with Premium — entry, stop, targets, live data, strategy details.
        </div>
        <Link
          href="/pricing"
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-[#5B8CFF]/40 bg-[#5B8CFF]/15 px-3 py-1.5 text-[12px] font-semibold text-[#F3F7FF] hover:bg-[#5B8CFF]/25 transition-colors"
        >
          Upgrade to Premium
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-b border-white/[0.05]">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-[#0D1E34] to-[#0B1728] border border-[#5B8CFF]/20 px-4 py-4">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#5B8CFF]/40 to-transparent" />
        <div className="space-y-1.5">
          <div className="text-[13px] font-semibold text-[#F3F7FF]">
            {symbol} · {direction} Setup
          </div>
          {teaserText && (
            <div className="text-[12px] text-[#70809A]">{teaserText}</div>
          )}
          <div className="text-[12px] text-[#70809A] mt-1">
            Exact entry zone, stop loss, all targets, live confidence, and strategy breakdown locked behind Premium.
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#5B8CFF]/40 bg-[#5B8CFF]/18 px-4 py-2 text-[13px] font-semibold text-[#F3F7FF] hover:bg-[#5B8CFF]/28 transition-colors"
          >
            Unlock Full Trade Plan
          </Link>
        </div>
        <div className="mt-2.5 text-[11px] text-[#70809A]">
          Includes: exact entry · stop · TP1–3 · live freshness · full confidence · strategy contributors
        </div>
      </div>
    </div>
  );
}
