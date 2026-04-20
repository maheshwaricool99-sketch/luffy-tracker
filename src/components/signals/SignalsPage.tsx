"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, startTransition } from "react";
import type { AdminSignalListItemDto, SignalDrawerDto, SignalListItemDto, SignalsPulseDto } from "@/lib/signals/types/signalDtos";
import { SignalsMetricsBand } from "./SignalsMetricsBand";
import { SignalsFilterBar, type SignalFilterState } from "./SignalsFilterBar";
import { SignalCard } from "./SignalCard";
import { SignalDetailPanel } from "./detail/SignalDetailPanel";
import { SignalDetailSheet } from "./detail/SignalDetailSheet";
import { TrustFooter } from "./TrustFooter";
import { EmptySignalsState } from "./EmptySignalsState";
const AdminSignalDrawer = dynamic(() => import("@/components/admin/signals/AdminSignalDrawer").then((mod) => mod.AdminSignalDrawer));
const AdminSignalsPage = dynamic(() => import("@/components/admin/signals/AdminSignalsPage").then((mod) => mod.AdminSignalsPage));

type SignalsResponse = {
  items: SignalListItemDto[];
  pageInfo: { nextCursor: string | null; hasMore: boolean };
  meta: { role: string; delayed: boolean };
};

export function SignalsPage({
  initialMarket,
  initialQuery,
  initialPayload,
  initialPulse,
  initialSelected = null,
}: {
  initialMarket?: string;
  initialQuery?: string;
  initialPayload: SignalsResponse;
  initialPulse: SignalsPulseDto | null;
  initialSelected?: SignalDrawerDto | null;
}) {
  const [filters, setFilters] = useState<SignalFilterState>({
    market: initialMarket,
    query: initialQuery,
  });
  const [payload, setPayload] = useState<SignalsResponse | null>(initialPayload);
  const pulse = initialPulse;
  const [selected, setSelected] = useState<SignalDrawerDto | null>(initialSelected);
  const [adminItems, setAdminItems] = useState<AdminSignalListItemDto[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const detailCache = useRef(new Map<string, SignalDrawerDto>());

  const role = payload?.meta.role ?? "GUEST";
  const isAdmin = role === "ADMIN" || role === "SUPERADMIN";

  const loadDetail = useCallback(async (id: string) => {
    const cached = detailCache.current.get(id);
    if (cached) {
      setSelected(cached);
      setMobileSheetOpen(true);
      return;
    }
    setIsLoadingDetail(true);
    setMobileSheetOpen(true);
    try {
      const res = await fetch(`/api/signals/${id}`, { cache: "no-store" });
      const dto = await res.json() as SignalDrawerDto;
      detailCache.current.set(id, dto);
      setSelected(dto);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  // Refetch list when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.market) params.set("market", filters.market);
    if (filters.query) params.set("query", filters.query);
    if (filters.direction) params.set("direction", filters.direction);
    if (filters.confidenceMin) params.set("confidenceMin", String(filters.confidenceMin));
    if (filters.status) params.set("status", filters.status);
    if (filters.sortBy) params.set("sortBy", filters.sortBy);
    if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
    params.set("limit", "20");

    const isInitial =
      (filters.market ?? "") === (initialMarket ?? "") &&
      (filters.query ?? "") === (initialQuery ?? "") &&
      !filters.direction && !filters.confidenceMin && !filters.status &&
      !filters.sortBy;
    if (isInitial) return;

    const ctrl = new AbortController();
    setIsLoadingList(true);
    setSelected(null);
    detailCache.current.clear();

    fetch(`/api/signals?${params.toString()}`, { cache: "no-store", signal: ctrl.signal })
      .then((r) => r.json())
      .then((json) => startTransition(() => setPayload(json)))
      .catch(() => { if (!ctrl.signal.aborted) setPayload({ items: [], pageInfo: { nextCursor: null, hasMore: false }, meta: { role: "GUEST", delayed: true } }); })
      .finally(() => { if (!ctrl.signal.aborted) setIsLoadingList(false); });

    return () => ctrl.abort();
  }, [filters, initialMarket, initialQuery]);

  // Admin items
  useEffect(() => {
    if (!isAdmin || !showAdminTools) { setAdminItems([]); return; }
    const params = new URLSearchParams();
    if (filters.market) params.set("market", filters.market);
    if (filters.query) params.set("query", filters.query);
    params.set("limit", "50");
    const ctrl = new AbortController();
    fetch(`/api/admin/signals?${params.toString()}`, { cache: "no-store", signal: ctrl.signal })
      .then((r) => r.json())
      .then((a) => setAdminItems(a.items ?? []))
      .catch(() => { if (!ctrl.signal.aborted) setAdminItems([]); });
    return () => ctrl.abort();
  }, [filters.market, filters.query, isAdmin, showAdminTools]);

  const loadMore = useCallback(async () => {
    if (!payload?.pageInfo.hasMore || !payload.pageInfo.nextCursor) return;
    const params = new URLSearchParams();
    if (filters.market) params.set("market", filters.market);
    if (filters.query) params.set("query", filters.query);
    params.set("limit", "20");
    params.set("cursor", payload.pageInfo.nextCursor);
    setIsLoadingMore(true);
    try {
      const res = await fetch(`/api/signals?${params.toString()}`, { cache: "no-store" });
      const next = await res.json();
      setPayload((p) => p ? { ...next, items: [...p.items, ...(next.items ?? [])] } : next);
    } finally {
      setIsLoadingMore(false);
    }
  }, [filters.market, filters.query, payload]);

  const items = payload?.items ?? [];

  return (
    <div className="space-y-4">
      {/* Metrics band */}
      <SignalsMetricsBand pulse={pulse} role={role} />

      {/* Filter bar */}
      <SignalsFilterBar filters={filters} onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))} />

      {/* Admin banner */}
      {isAdmin && (
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0B1728] px-4 py-3 text-[13px] text-[#A7B4C8]">
          <span>Admin tools are isolated from the public surface.</span>
          <button
            type="button"
            onClick={() => setShowAdminTools((v) => !v)}
            className="rounded-xl border border-[#5B8CFF]/35 bg-[#5B8CFF]/12 px-3 py-2 text-sm font-semibold text-[#F3F7FF]"
          >
            {showAdminTools ? "Hide moderation" : "Load moderation"}
          </button>
        </div>
      )}

      {/* 2-column layout */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,44%)_minmax(0,56%)]">
        {/* Signal list column */}
        <div className="min-w-0 space-y-3">
          {isLoadingList && (
            <p className="text-[13px] text-[#70809A]">Refreshing…</p>
          )}

          {!payload || items.length === 0 ? (
            <EmptySignalsState />
          ) : (
            <div className="grid gap-2.5">
              {items.map((signal) => (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  role={role}
                  selected={selected?.id === signal.id}
                  onSelect={() => void loadDetail(signal.id)}
                />
              ))}
            </div>
          )}

          {payload?.pageInfo.hasMore && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={isLoadingMore}
                className="rounded-xl border border-white/10 bg-[#0B1728] px-4 py-2 text-[13px] font-semibold text-[#F3F7FF] disabled:opacity-60"
              >
                {isLoadingMore ? "Loading more…" : "Load more"}
              </button>
            </div>
          )}

          {showAdminTools && adminItems.length > 0 && <AdminSignalsPage items={adminItems} />}
        </div>

        {/* Detail panel — desktop only */}
        <div className="hidden lg:block">
          <SignalDetailPanel signal={selected} role={role} loading={isLoadingDetail} />
          {selected && isAdmin && showAdminTools && (
            <div className="mt-3">
              <AdminSignalDrawer signal={selected} />
            </div>
          )}
        </div>
      </div>

      {/* Mobile full-screen detail sheet */}
      <div className="lg:hidden">
        <SignalDetailSheet
          signal={mobileSheetOpen ? selected : null}
          role={role}
          loading={isLoadingDetail}
          onClose={() => { setMobileSheetOpen(false); }}
        />
      </div>

      <TrustFooter />
    </div>
  );
}
