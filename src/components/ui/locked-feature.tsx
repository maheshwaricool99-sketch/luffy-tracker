import Link from "next/link";

export function LockedFeature({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4">
      <div className="text-sm font-semibold text-[#F3F7FF]">Upgrade Required</div>
      <div className="mt-2 text-[13px] leading-[18px] text-[#A7B4C8]">{title}</div>
      <div className="mt-1 text-[12px] text-[#70809A]">{detail}</div>
      <Link href="/pricing" className="mt-3 inline-flex rounded-xl border border-[#5B8CFF]/35 bg-[#5B8CFF]/12 px-3 py-2 text-sm font-semibold text-[#F3F7FF]">
        Upgrade to Premium
      </Link>
    </div>
  );
}
