import Link from "next/link";

export function UpsellBanner({ role }: { role: string }) {
  const isGuest = role === "GUEST";
  const href = isGuest ? "/signup" : "/pricing";
  const cta = isGuest ? "Create free account" : "Upgrade to Premium";
  const headline = isGuest
    ? "Sign up to see delayed trade plans"
    : "Unlock full trade plans and real-time signals";
  const detail = isGuest
    ? "Free accounts see the full signal catalog with a 15-minute delay."
    : "Premium members see exact entry zones, stops, targets, and live freshness — no delay.";

  return (
    <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/[0.08] to-transparent p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-amber-200">{headline}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#A7B4C8]">{detail}</p>
        </div>
        <Link
          href={href}
          className="flex-shrink-0 rounded-xl border border-amber-400/40 bg-amber-400/15 px-3 py-2 text-[12px] font-semibold text-amber-100 transition-colors hover:bg-amber-400/25"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}
