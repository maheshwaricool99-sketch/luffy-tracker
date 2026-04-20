export default function PerformanceLoading() {
  return (
    <div className="space-y-5">
      <div className="h-52 animate-pulse rounded-[28px] border border-white/10 bg-white/[0.04]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-[24px] border border-white/10 bg-white/[0.04]" />
        ))}
      </div>
      <div className="h-18 animate-pulse rounded-[24px] border border-white/10 bg-white/[0.04]" />
      <div className="h-[360px] animate-pulse rounded-[28px] border border-white/10 bg-white/[0.04]" />
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-72 animate-pulse rounded-[28px] border border-white/10 bg-white/[0.04]" />
        ))}
      </div>
      <div className="h-[420px] animate-pulse rounded-[28px] border border-white/10 bg-white/[0.04]" />
    </div>
  );
}
