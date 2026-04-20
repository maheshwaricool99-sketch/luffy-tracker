"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchInput } from "@/components/primitives/SearchInput";
import { StatusChip } from "@/components/primitives/StatusChip";
import { AvatarMenu } from "@/components/layout/AvatarMenu";
import { resolveEntitlements, type Viewer } from "@/lib/entitlements";
import { useMobileNav } from "@/components/layout/MobileNavContext";

const markets = [
  { value: "all", label: "All" },
  { value: "crypto", label: "Crypto" },
  { value: "us", label: "US" },
  { value: "india", label: "India" },
];

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/signals": "Signals",
  "/analysis": "Analysis",
  "/intelligence": "Intelligence",
  "/performance": "Performance",
  "/health": "Health",
  "/pricing": "Pricing",
  "/account": "Account",
  "/billing": "Billing",
  "/watchlists": "Watchlists",
  "/alerts": "Alerts",
  "/admin/members": "Admin · Members",
  "/admin/system": "Admin · System",
  "/admin/scanners": "Admin · Scanners",
  "/admin/integrity": "Admin · Integrity",
  "/admin/experiments": "Admin · Experiments",
  "/admin/lab": "Admin · Lab",
};

function HamburgerButton() {
  const { open } = useMobileNav();
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open navigation menu"
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#A7B4C8] hover:bg-white/[0.08] hover:text-[#F3F7FF] active:scale-95 transition-all lg:hidden"
    >
      <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
        <path d="M1 1h16M1 7h16M1 13h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export function TopBar({ viewer }: { viewer: Viewer | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const supportsMarketFilters = pathname === "/" || pathname.startsWith("/signals");
  const supportsSearch = supportsMarketFilters;
  const market = searchParams.get("market") ?? "all";
  const query = searchParams.get("query") ?? "";
  const [queryDraft, setQueryDraft] = useState(query);
  const entitlements = resolveEntitlements(viewer);

  // Page title for mobile header
  const pageTitle = useMemo(() => {
    for (const [prefix, title] of Object.entries(PAGE_TITLES)) {
      if (pathname === prefix || (prefix !== "/" && pathname.startsWith(prefix))) {
        return title;
      }
    }
    return "Terminal";
  }, [pathname]);

  useEffect(() => {
    setQueryDraft(query);
  }, [query]);

  const baseParams = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);

  const replaceWithParams = useCallback((params: URLSearchParams) => {
    startTransition(() => {
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
    });
  }, [pathname, router]);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(baseParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    replaceWithParams(params);
  }

  useEffect(() => {
    if (!supportsSearch) return;
    if (queryDraft === query) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(baseParams.toString());
      if (queryDraft) params.set("query", queryDraft);
      else params.delete("query");
      replaceWithParams(params);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [baseParams, query, queryDraft, replaceWithParams, supportsSearch]);

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[rgba(8,20,35,0.92)] backdrop-blur-md">
      <div className="flex min-h-14 items-center gap-2 px-4 py-2 md:min-h-16 md:gap-4 md:px-5">
        {/* Mobile: Hamburger */}
        <HamburgerButton />

        {/* Mobile: Page title (centered) | Desktop: Market filter buttons */}
        <div className="flex min-w-0 flex-1 items-center">
          {/* Mobile page title — shown only when no market filters */}
          <div className="min-w-0 lg:hidden">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#70809A]">Signal Intelligence</div>
            <span className="block truncate text-[14px] font-semibold text-[#F3F7FF]">
              {pageTitle}
            </span>
          </div>

          {/* Desktop: market filter buttons */}
          <div className="hidden items-center gap-1.5 lg:flex">
            {supportsMarketFilters ? (
              markets.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setParam("market", item.value === "all" ? "" : item.value)}
                  className={
                    market === item.value
                      ? "rounded-xl border border-[#5B8CFF]/35 bg-[#5B8CFF]/12 px-3 py-2 text-sm font-semibold text-[#F3F7FF]"
                      : "rounded-xl border border-transparent px-3 py-2 text-sm font-semibold text-[#A7B4C8] hover:bg-white/[0.05] hover:text-[#F3F7FF]"
                  }
                >
                  {item.label}
                </button>
              ))
            ) : (
              <span className="text-sm text-[#70809A]">{pageTitle}</span>
            )}
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex flex-shrink-0 items-center gap-2 md:gap-3">
          {/* Search — shown on mobile too when route supports it */}
          {supportsSearch && (
            <div className="hidden md:block">
              <SearchInput
                value={queryDraft}
                onChange={(event) => setQueryDraft(event.target.value)}
                placeholder="Search symbol"
                className="w-full min-w-[220px]"
              />
            </div>
          )}

          {/* Status chips — desktop only */}
          <StatusChip
            label={isPending ? "Updating" : "Market Open"}
            tone={isPending ? "blue" : "green"}
            className="hidden lg:inline-flex"
          />
          <StatusChip label="Health Monitored" tone="blue" className="hidden xl:inline-flex" />

          {viewer ? (
            <>
              <StatusChip
                label={entitlements.plan}
                tone={entitlements.isPremium ? "green" : "blue"}
                className="hidden lg:inline-flex"
              />
              {entitlements.isAdmin ? (
                <StatusChip label="ADMIN" tone="yellow" className="hidden lg:inline-flex" />
              ) : null}
            </>
          ) : null}

          <AvatarMenu viewer={viewer} />
        </div>
      </div>

      {/* Mobile market filter bar — shown below header on signal/home pages */}
      {supportsMarketFilters && (
        <div className="space-y-2 border-t border-white/[0.05] px-4 py-3 lg:hidden">
          {supportsSearch ? (
            <SearchInput
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              placeholder="Search symbol"
              className="w-full"
            />
          ) : null}
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {markets.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setParam("market", item.value === "all" ? "" : item.value)}
                className={
                  market === item.value
                    ? "flex-shrink-0 rounded-lg border border-[#5B8CFF]/35 bg-[#5B8CFF]/12 px-3 py-2 text-[13px] font-semibold text-[#F3F7FF]"
                    : "flex-shrink-0 rounded-lg border border-white/[0.06] px-3 py-2 text-[13px] font-medium text-[#A7B4C8]"
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
