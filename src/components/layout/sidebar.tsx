"use client";

import { NAV_ITEMS } from "@/config/navigation";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { NavItem } from "@/config/navigation";

function buildHref(path: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("terminal-sidebar-collapsed") === "1";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const token = query.trim().toLowerCase();
    if (!token) return NAV_ITEMS;
    return NAV_ITEMS.filter((item: NavItem) => item.label.toLowerCase().includes(token));
  }, [query]);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem("terminal-sidebar-collapsed", next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "w-full border-b border-[var(--line)] bg-[linear-gradient(180deg,rgba(16,26,42,0.96),rgba(9,15,23,0.90))] px-2 py-2.5 shadow-[inset_-1px_0_0_rgba(255,255,255,0.03),0_24px_50px_rgba(2,8,20,0.28)] backdrop-blur-xl md:border-b-0 md:border-r md:p-3.5",
        collapsed ? "md:w-[92px]" : "md:w-72",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3 px-2">
        <div className={cn("min-w-0", collapsed && "md:hidden")}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Institutional Grade</p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">Signal Intelligence Terminal</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className="rounded-xl border border-[var(--line)] px-3 py-1.5 text-[11px] text-[var(--text-soft)] hover:text-[var(--text-strong)] md:hidden"
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? "Close" : "Menu"}
          </button>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden rounded-xl border border-[var(--line)] px-3 py-1.5 text-[11px] text-[var(--text-soft)] hover:text-[var(--text-strong)] md:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>
      </div>
      <div className={cn("space-y-3", !mobileOpen && "hidden md:block")}>
        <div className={cn("px-2", collapsed && "md:hidden")}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages"
            className="h-10 w-full rounded-2xl border border-[var(--line)] bg-black/20 px-3 text-sm text-[var(--text-strong)] outline-none focus:border-sky-400/60"
          />
        </div>
        <nav className="smooth-scroll-pane flex gap-1 overflow-x-auto md:max-h-[calc(100vh-190px)] md:flex-col md:overflow-auto md:pr-1">
          {filtered.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={buildHref(item.href, params)}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex shrink-0 items-center justify-between whitespace-nowrap rounded-2xl px-3 py-2.5 text-[13px] transition-all",
                  isActive
                    ? "border border-sky-400/45 bg-sky-500/18 text-sky-100 shadow-[0_6px_20px_rgba(56,189,248,0.16)]"
                    : "border border-transparent text-[var(--text-soft)] hover:border-[var(--line)] hover:bg-white/[0.04] hover:text-[var(--text-strong)]",
                  collapsed && "md:justify-center md:px-2",
                )}
              >
                <span className={cn(collapsed && "md:hidden")}>{item.label}</span>
                <span className={cn("hidden rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-[var(--text-muted)] md:inline-flex", collapsed && "md:hidden")}>
                  {item.href === "/" ? "Home" : item.href.split("/").filter(Boolean).at(-1)}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
