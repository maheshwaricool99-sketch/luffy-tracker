"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function PremiumGate({
  locked,
  title,
  detail,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  children,
}: {
  locked: boolean;
  title: string;
  detail: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <div className={locked ? "pointer-events-none select-none blur-[2px] saturate-[0.75]" : ""}>
        {children}
      </div>
      {locked ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-[28px] bg-[linear-gradient(180deg,rgba(4,10,19,0.24),rgba(4,10,19,0.82))] p-5">
          <div className="max-w-md rounded-3xl border border-white/10 bg-[#091523]/95 p-5 text-center shadow-[0_22px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#7DD3FC]">Locked Analytics</div>
            <h3 className="mt-2 text-xl font-semibold text-[#F3F7FF]">{title}</h3>
            <p className="mt-2 text-[13px] leading-6 text-[#9FB1C7]">{detail}</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link href={primaryHref} className="rounded-xl border border-[#7DD3FC]/35 bg-[#7DD3FC]/12 px-4 py-2 text-sm font-semibold text-[#E8F8FF]">
                {primaryLabel}
              </Link>
              {secondaryLabel && secondaryHref ? (
                <Link href={secondaryHref} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-[#D8E4F2]">
                  {secondaryLabel}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
