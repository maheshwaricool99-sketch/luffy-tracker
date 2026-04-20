"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { getVisibleNavItems } from "@/config/navigation";
import type { Viewer } from "@/lib/entitlements";
import { resolveEntitlements } from "@/lib/entitlements";
import { useMobileNav } from "./MobileNavContext";

const SECTION_LABELS: Record<string, string> = {
  primary: "Navigation",
  utility: "Account",
  admin: "Admin",
};

const NAV_ICONS: Record<string, string> = {
  "/": "⊞",
  "/signals": "◈",
  "/analysis": "◬",
  "/intelligence": "◆",
  "/performance": "▦",
  "/health": "◉",
  "/pricing": "★",
  "/account": "◎",
  "/billing": "◈",
  "/watchlists": "♦",
  "/alerts": "◷",
  "/admin/members": "◬",
  "/admin/system": "⊛",
  "/admin/scanners": "⊕",
  "/admin/integrity": "⊘",
  "/admin/experiments": "⊗",
  "/admin/lab": "⊞",
};

interface MobileDrawerNavProps {
  viewer: Viewer | null;
}

export function MobileDrawerNav({ viewer }: MobileDrawerNavProps) {
  const { isOpen, close } = useMobileNav();
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const visibleItems = getVisibleNavItems(viewer);
  const entitlements = resolveEntitlements(viewer);

  const groups = {
    primary: visibleItems.filter((item) => item.section === "primary"),
    utility: visibleItems.filter((item) => item.section === "utility"),
    admin: visibleItems.filter((item) => item.section === "admin"),
  };

  // Auto-close on route change
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Focus close button when drawer opens
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const drawer = drawerRef.current;
    if (!drawer) return;
    const focusable = drawer.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    drawer.addEventListener("keydown", handleKeyDown);
    return () => drawer.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={close}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[300px] max-w-[88vw] flex-col bg-[#081423] shadow-[4px_0_40px_rgba(0,0,0,0.5)] transition-transform duration-200 ease-out lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Drawer header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#70809A]">
              Signal Intelligence
            </p>
            <p className="mt-0.5 text-[15px] font-bold text-[#F3F7FF]">Terminal</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            aria-label="Close navigation"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#A7B4C8] hover:bg-white/[0.08] hover:text-[#F3F7FF] active:scale-95 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* User info strip */}
        {viewer && (
          <div className="flex-shrink-0 border-b border-white/[0.06] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-sm font-bold text-[#F3F7FF]">
                {viewer.email.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-[#F3F7FF]">
                  {viewer.name ?? viewer.email}
                </div>
                <div className="text-[11px] text-[#70809A]">
                  {viewer.role} · {viewer.subscription?.plan ?? "FREE"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nav items — scrollable */}
        <nav
          className="min-h-0 flex-1 overflow-y-auto px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Main navigation"
        >
          <div className="space-y-4">
            {(Object.entries(groups) as [string, typeof visibleItems][]).map(([section, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={section}>
                  <div
                    className={cn(
                      "mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#516077]",
                      section === "admin" && "border-t border-white/[0.06] pt-3",
                    )}
                  >
                    {SECTION_LABELS[section]}
                  </div>
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex min-h-[44px] items-center gap-3 rounded-xl border px-3 py-2.5 text-[14px] font-medium transition-colors",
                            active
                              ? "border-[#5B8CFF]/35 bg-[#5B8CFF]/12 text-[#F3F7FF]"
                              : "border-transparent text-[#A7B4C8] hover:bg-white/[0.05] hover:text-[#F3F7FF] active:bg-white/[0.08]",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[12px] font-bold",
                              active ? "bg-[#5B8CFF]/20 text-[#89A8FF]" : "bg-white/[0.05] text-[#70809A]",
                            )}
                          >
                            {NAV_ICONS[item.href] ?? item.short}
                          </span>
                          <span>{item.label}</span>
                          {active && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#5B8CFF]" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Bottom actions */}
        <div className="flex-shrink-0 space-y-2 border-t border-white/[0.06] px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          {!entitlements.isPremium && (
            <Link
              href="/pricing"
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#5B8CFF]/40 bg-[#5B8CFF]/15 px-3 py-2.5 text-[13px] font-semibold text-[#F3F7FF] active:bg-[#5B8CFF]/25 transition-colors"
            >
              <span>★</span>
              Upgrade to Premium
            </Link>
          )}
          {viewer ? (
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="flex min-h-[44px] w-full items-center gap-3 rounded-xl border border-white/[0.06] px-3 py-2.5 text-[13px] font-medium text-[#70809A] hover:bg-white/[0.05] hover:text-[#A7B4C8] active:bg-white/[0.08] transition-colors"
              >
                <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-[11px] text-[#70809A]">
                  ⊗
                </span>
                Sign Out
              </button>
            </form>
          ) : (
            <div className="flex gap-2">
              <Link
                href="/login"
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-white/10 px-3 text-[13px] font-semibold text-[#A7B4C8]"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-[#5B8CFF]/35 bg-[#5B8CFF]/12 px-3 text-[13px] font-semibold text-[#F3F7FF]"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
