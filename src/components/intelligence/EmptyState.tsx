export function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-[#081423] px-6 py-16 text-center">
      <div className="text-[32px] mb-3">◈</div>
      <div className="text-[15px] font-semibold text-[#F3F7FF]">
        {filtered ? "No signals match your filters" : "No active signals right now"}
      </div>
      <div className="mt-2 max-w-sm text-[13px] text-[#70809A]">
        {filtered
          ? "Try adjusting your market, direction, confidence, or freshness filters to see more opportunities."
          : "The scanner is healthy — no setup currently meets the publish threshold. Check back shortly or review watchlist candidates."}
      </div>
    </div>
  );
}
