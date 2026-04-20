function SkeletonCard({ height = "h-40" }: { height?: string }) {
  return (
    <div className={`animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--surface-glass)] p-4 ${height}`}>
      <div className="h-4 w-40 rounded bg-white/10" />
      <div className="mt-3 h-3 w-56 rounded bg-white/10" />
      <div className="mt-5 space-y-2">
        <div className="h-3 w-full rounded bg-white/10" />
        <div className="h-3 w-5/6 rounded bg-white/10" />
        <div className="h-3 w-2/3 rounded bg-white/10" />
      </div>
    </div>
  );
}

export default function LoadingAnalysisSymbolPage() {
  return (
    <main className="min-h-screen w-full overflow-x-hidden py-4 sm:py-6 lg:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <SkeletonCard height="h-28" />
        <SkeletonCard height="h-16" />
        <SkeletonCard height="h-44" />
        <section className="grid gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <SkeletonCard height="h-[460px]" />
            <SkeletonCard height="h-60" />
          </div>
          <div className="space-y-4">
            <SkeletonCard height="h-64" />
            <SkeletonCard height="h-56" />
            <SkeletonCard height="h-56" />
          </div>
        </section>
      </div>
    </main>
  );
}
