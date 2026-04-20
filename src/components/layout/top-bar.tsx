"use client";

import { Badge } from "@/components/ui/badge";
import { NAV_ITEMS } from "@/config/navigation";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ChangeEvent, useMemo } from "react";

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const market = searchParams.get("market") ?? "all";
  const query = searchParams.get("query") ?? "";
  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  };
  const pageLabel = useMemo(
    () => NAV_ITEMS.find((item) => item.href === pathname)?.label ?? "Signal Intelligence",
    [pathname],
  );

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[linear-gradient(180deg,rgba(9,15,23,0.9),rgba(9,15,23,0.78))] px-3 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-[rgba(9,15,23,0.72)] md:px-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Current Surface</label>
            <div className="flex items-center gap-2">
              <div className="h-10 flex-1 rounded-2xl border border-[var(--line)] bg-black/30 px-3 text-sm text-[var(--text-strong)] flex items-center">
                {pageLabel}
              </div>
              <select
                value={market}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => updateParam("market", event.target.value)}
                className="h-10 rounded-2xl border border-[var(--line)] bg-black/25 px-3 text-sm text-[var(--text-strong)] outline-none focus:border-sky-400/60"
              >
                <option value="all">All Markets</option>
                <option value="crypto">Crypto</option>
                <option value="us">US</option>
                <option value="india">India</option>
              </select>
            </div>
            <p className="mt-1 text-[10px] text-[var(--text-muted)]">Single-pipeline signal publication with integrity gating and lifecycle tracking.</p>
          </div>
          <div className="flex min-w-[180px] flex-col gap-1">
            <label className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Page Selector</label>
            <select value={pathname} onChange={(e: ChangeEvent<HTMLSelectElement>) => router.push(e.target.value)} className="h-10 rounded-2xl border border-[var(--line)] bg-black/25 px-3 text-sm text-[var(--text-strong)] outline-none focus:border-sky-400/60">
              {NAV_ITEMS.map((item) => <option key={item.href} value={item.href}>{item.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.04] bg-white/[0.02] px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <input
            value={query}
            onChange={(event: ChangeEvent<HTMLInputElement>) => updateParam("query", event.target.value)}
            placeholder="Search symbol"
            className="h-10 min-w-[180px] rounded-2xl border border-[var(--line)] bg-black/25 px-3 text-sm text-[var(--text-strong)] outline-none focus:border-sky-400/60"
          />
          <Badge variant="premium">Publication: Validation First</Badge>
          <Badge variant="bullish">Pipeline: Unified</Badge>
          <Badge variant="premium">Mode: Runtime Controlled</Badge>
        </div>
      </div>
    </header>
  );
}
