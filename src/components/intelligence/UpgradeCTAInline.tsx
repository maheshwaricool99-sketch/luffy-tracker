import Link from "next/link";

interface UpgradeCTAInlineProps {
  premiumCount?: number;
}

export function UpgradeCTAInline({ premiumCount }: UpgradeCTAInlineProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#5B8CFF]/25 bg-gradient-to-br from-[#0D1E34] via-[#0B1728] to-[#081423] p-5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(91,140,255,0.08),transparent_60%)]" />
      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5B8CFF]">Premium Intelligence</div>
        <div className="mt-2 text-[16px] font-bold leading-snug text-[#F3F7FF]">
          Unlock the full decision engine
        </div>
        <div className="mt-1.5 text-[13px] leading-relaxed text-[#70809A]">
          {premiumCount ? `${premiumCount} premium-only signals hidden.` : "Your plan shows delayed and partial signals only."}
          {" "}Upgrade to unlock everything.
        </div>
        <ul className="mt-3 space-y-1.5">
          {[
            "Exact entry, stop, and all targets",
            "Real-time freshness — not delayed",
            "Full confidence score and reasoning",
            "Strategy contributor breakdown",
            "Premium-only top-ranked setups",
            "Advanced filters and sorting",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-[12px] text-[#A7B4C8]">
              <span className="shrink-0 text-[#5B8CFF]">✓</span>
              {item}
            </li>
          ))}
        </ul>
        <Link
          href="/pricing"
          className="mt-4 flex items-center justify-center rounded-xl border border-[#5B8CFF]/50 bg-[#5B8CFF]/20 px-4 py-2.5 text-[14px] font-semibold text-[#F3F7FF] hover:bg-[#5B8CFF]/30 transition-colors"
        >
          Upgrade to Premium
        </Link>
      </div>
    </div>
  );
}
