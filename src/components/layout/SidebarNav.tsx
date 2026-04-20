"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getVisibleNavItems } from "@/config/navigation";
import { cn } from "@/lib/cn";
import type { Viewer } from "@/lib/entitlements";

export function SidebarNav({ viewer }: { viewer: Viewer | null }) {
  const pathname = usePathname();
  const visibleItems = getVisibleNavItems(viewer);
  const groups = {
    primary: visibleItems.filter((item) => item.section === "primary"),
    utility: visibleItems.filter((item) => item.section === "utility"),
    admin: visibleItems.filter((item) => item.section === "admin"),
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-30 hidden w-[272px] flex-col border-r border-white/10 bg-[#081423] lg:flex">
      {/* Branding — fixed height, never scrolls */}
      <div className="flex-shrink-0 border-b border-white/[0.06] px-4 pb-4 pt-5">
        <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#70809A]">Signal Intelligence</p>
        <h2 className="mt-2 text-[18px] font-semibold leading-6 text-[#F3F7FF]">Institutional Terminal</h2>
        <p className="mt-2 text-[13px] font-medium leading-[18px] text-[#A7B4C8]">Signals, regime, diagnostics, and health in one workstation.</p>
      </div>
      {/* Nav — scrollable, owns its own overflow so admin items are always reachable */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10">
          <div className="space-y-5">
            {Object.entries(groups).map(([section, items]) => (
              items.length > 0 ? (
              <div key={section}>
                <div className={cn("mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#516077]", section === "admin" && "border-t border-white/[0.06] pt-4")}>
                  {section}
                </div>
                <div className="space-y-1">
                {items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={section !== "admin"}
                      className={cn(
                        "flex h-10 items-center gap-[10px] rounded-xl border px-3 text-sm font-medium",
                        active
                          ? "border-[#5B8CFF]/35 bg-[#5B8CFF]/12 text-[#F3F7FF]"
                          : "border-transparent text-[#A7B4C8] hover:bg-white/[0.05] hover:text-[#F3F7FF]",
                      )}
                    >
                      <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-md bg-white/[0.05] text-[10px] font-semibold text-[#70809A]">{item.short}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                </div>
              </div>
              ) : null
            ))}
          </div>
      </nav>
      {/* Workspace card — fixed at bottom, never hidden */}
      <div className="flex-shrink-0 border-t border-white/[0.06] px-4 py-3">
        <div className="rounded-2xl border border-white/10 bg-[#0B1728] p-3">
          <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#70809A]">Workspace</div>
          <div className="mt-2 text-[14px] font-semibold text-[#F3F7FF]">Operations Desk</div>
          <div className="mt-1 text-[12px] font-medium text-[#A7B4C8]">
            {viewer ? `${viewer.role} · ${viewer.subscription?.plan ?? "FREE"}` : "Guest access"}
          </div>
        </div>
      </div>
    </aside>
  );
}
