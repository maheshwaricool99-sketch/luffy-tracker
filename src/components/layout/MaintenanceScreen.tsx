export function MaintenanceScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050B14] px-6 py-12">
      <div className="max-w-lg rounded-3xl border border-amber-500/25 bg-[#0B1728] p-8 text-center shadow-[0_26px_90px_rgba(2,8,20,0.45)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
          Maintenance Mode
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-[#F3F7FF]">
          The platform is temporarily unavailable
        </h1>
        <p className="mt-3 text-[14px] leading-6 text-[#A7B4C8]">
          Admin access, the health dashboard, and diagnostics remain reachable while maintenance completes. Public surfaces will return automatically — no action is required.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[13px]">
          <a href="/health" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 font-medium text-[#D8E4F2]">
            View health status
          </a>
          <a href="/login" className="rounded-xl border border-[#7DD3FC]/35 bg-[#7DD3FC]/12 px-4 py-2 font-semibold text-[#E8F8FF]">
            Admin sign in
          </a>
        </div>
      </div>
    </div>
  );
}
