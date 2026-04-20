"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import type { Viewer } from "@/lib/entitlements";
import { resolveEntitlements } from "@/lib/entitlements";

export function AvatarMenu({ viewer }: { viewer: Viewer | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!viewer) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-[#A7B4C8] hover:bg-white/[0.05] hover:text-[#F3F7FF]">
          Login
        </Link>
        <Link href="/pricing" className="rounded-xl border border-[#5B8CFF]/35 bg-[#5B8CFF]/12 px-3 py-2 text-sm font-semibold text-[#F3F7FF]">
          Buy Premium
        </Link>
      </div>
    );
  }

  const entitlements = resolveEntitlements(viewer);
  const initial = viewer.email.slice(0, 1).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
        className="flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm font-semibold text-[#F3F7FF] hover:bg-white/[0.08]"
      >
        {initial}
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-12 z-40 w-60 max-w-[calc(100vw-1rem)] rounded-2xl border border-white/10 bg-[#081423] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
          <div className="border-b border-white/[0.06] pb-3">
            <div className="text-sm font-semibold text-[#F3F7FF]">{viewer.name ?? viewer.email}</div>
            <div className="mt-1 text-xs text-[#70809A]">{viewer.role} · {viewer.subscription?.plan ?? "FREE"} · {viewer.accountStatus}</div>
          </div>
          <div className="mt-3 space-y-1">
            <Link href="/account" className="block rounded-xl px-3 py-2 text-sm text-[#A7B4C8] hover:bg-white/[0.05] hover:text-[#F3F7FF]">My Account</Link>
            <Link href="/billing" className="block rounded-xl px-3 py-2 text-sm text-[#A7B4C8] hover:bg-white/[0.05] hover:text-[#F3F7FF]">Billing</Link>
            {!entitlements.isPremium ? (
              <Link href="/pricing" className="block rounded-xl px-3 py-2 text-sm text-[#A7B4C8] hover:bg-white/[0.05] hover:text-[#F3F7FF]">Upgrade</Link>
            ) : null}
            {entitlements.isAdmin ? (
              <>
                <Link href="/admin/members" className="block rounded-xl px-3 py-2 text-sm text-[#A7B4C8] hover:bg-white/[0.05] hover:text-[#F3F7FF]">Admin: Members</Link>
                <Link href="/admin/system" className="block rounded-xl px-3 py-2 text-sm text-[#A7B4C8] hover:bg-white/[0.05] hover:text-[#F3F7FF]">Admin: System</Link>
              </>
            ) : null}
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="mt-2 w-full rounded-xl border border-white/10 px-3 py-2 text-left text-sm text-[#F3F7FF] hover:bg-white/[0.05]">
                Sign Out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
