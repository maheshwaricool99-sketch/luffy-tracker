"use client";

export default function PerformanceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="rounded-[28px] border border-rose-400/20 bg-rose-400/10 p-6">
      <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-rose-200">Performance</div>
      <h1 className="mt-2 text-2xl font-semibold text-white">Unable to load performance data</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-rose-100/90">
        Please retry in a moment. Admin users can enable the debug drawer once the route is reachable again.
      </p>
      <button onClick={reset} className="mt-5 rounded-xl border border-white/10 bg-white/[0.08] px-4 py-2 text-sm font-medium text-white">
        Retry
      </button>
    </section>
  );
}
