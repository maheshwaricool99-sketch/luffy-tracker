function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0B1728] overflow-hidden animate-pulse">
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.04]">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex gap-2">
              <div className="h-5 w-16 rounded bg-white/10" />
              <div className="h-5 w-12 rounded bg-white/[0.06]" />
              <div className="h-5 w-14 rounded bg-white/[0.06]" />
            </div>
            <div className="flex gap-1.5">
              <div className="h-4 w-10 rounded bg-white/[0.06]" />
              <div className="h-4 w-12 rounded bg-white/[0.06]" />
            </div>
          </div>
          <div className="h-9 w-12 rounded bg-white/10" />
        </div>
        <div className="mt-2.5 flex gap-2">
          <div className="h-1.5 w-full max-w-[120px] rounded-full bg-white/[0.06]" />
        </div>
      </div>
      <div className="px-4 py-3 border-b border-white/[0.04] space-y-1.5">
        <div className="h-3 w-24 rounded bg-white/[0.06]" />
        <div className="h-3 w-full rounded bg-white/[0.04]" />
        <div className="h-3 w-4/5 rounded bg-white/[0.04]" />
      </div>
      <div className="px-4 py-3 space-y-1.5">
        <div className="h-3 w-20 rounded bg-white/[0.06]" />
        <div className="h-3 w-full rounded bg-white/[0.04]" />
        <div className="h-3 w-3/4 rounded bg-white/[0.04]" />
      </div>
    </div>
  );
}

export function LoadingState({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </>
  );
}

export function FilterBarSkeleton() {
  return (
    <div className="flex items-center gap-2 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-8 w-20 rounded-xl bg-white/[0.06]" />
      ))}
    </div>
  );
}
