"use client";

import { useCallback } from "react";
import { cn } from "@/lib/cn";

export type SignalFilterState = {
  market?: string;
  direction?: "LONG" | "SHORT";
  confidenceMin?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  query?: string;
};

const MARKETS = [
  { label: "All", value: "" },
  { label: "Crypto", value: "CRYPTO" },
  { label: "US", value: "US" },
  { label: "India", value: "INDIA" },
];

const DIRECTIONS = [
  { label: "Both", value: "" },
  { label: "▲ Long", value: "LONG" },
  { label: "▼ Short", value: "SHORT" },
];

const CONFIDENCE_OPTIONS = [
  { label: "Any Confidence", value: "" },
  { label: "85%+ Elite", value: "85" },
  { label: "70%+ Strong", value: "70" },
  { label: "50%+ Good", value: "50" },
];

const STATUS_OPTIONS = [
  { label: "All Status", value: "" },
  { label: "Active", value: "PUBLISHED" },
  { label: "Triggered", value: "TRIGGERED" },
  { label: "Watch", value: "VALIDATED" },
];

const SORT_OPTIONS = [
  { label: "Newest First", value: "publishedAt:desc" },
  { label: "Top Confidence", value: "confidenceScore:desc" },
  { label: "Oldest First", value: "publishedAt:asc" },
];

function PillChip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-7 flex-shrink-0 rounded-lg border px-2.5 text-[11px] font-medium transition-colors whitespace-nowrap",
        active
          ? "border-[#5B8CFF]/50 bg-[#5B8CFF]/20 text-[#F3F7FF]"
          : "border-white/[0.08] bg-transparent text-[#70809A] hover:border-white/15 hover:text-[#A7B4C8]",
      )}
    >
      {children}
    </button>
  );
}

function FilterSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 flex-shrink-0 rounded-lg border border-white/[0.08] bg-[#0B1728] px-2 text-[11px] text-[#A7B4C8] focus:border-white/20 focus:outline-none"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

export function SignalsFilterBar({
  filters,
  onChange,
}: {
  filters: SignalFilterState;
  onChange: (patch: Partial<SignalFilterState>) => void;
}) {
  const isDirty = filters.market || filters.direction || filters.confidenceMin || filters.status || filters.query;

  const handleSort = useCallback((v: string) => {
    const [sortBy, sortOrder] = v.split(":") as [string, "asc" | "desc"];
    onChange({ sortBy, sortOrder });
  }, [onChange]);

  const currentSort = `${filters.sortBy ?? "publishedAt"}:${filters.sortOrder ?? "desc"}`;

  return (
    <div className="sticky top-14 z-30 border-b border-white/[0.06] bg-[rgba(6,17,31,0.95)] md:top-16 backdrop-blur-sm">
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2.5 scrollbar-none">
        {/* Market */}
        <div className="flex flex-shrink-0 items-center gap-1">
          {MARKETS.map((m) => (
            <PillChip
              key={m.value}
              active={filters.market === m.value || (!filters.market && m.value === "")}
              onClick={() => onChange({ market: m.value || undefined })}
            >
              {m.label}
            </PillChip>
          ))}
        </div>

        <div className="h-4 w-px flex-shrink-0 bg-white/10" />

        {/* Direction */}
        <div className="flex flex-shrink-0 items-center gap-1">
          {DIRECTIONS.map((d) => (
            <PillChip
              key={d.value}
              active={filters.direction === d.value || (!filters.direction && d.value === "")}
              onClick={() => onChange({ direction: (d.value as "LONG" | "SHORT") || undefined })}
            >
              {d.label}
            </PillChip>
          ))}
        </div>

        <div className="h-4 w-px flex-shrink-0 bg-white/10" />

        {/* Confidence select */}
        <FilterSelect
          value={String(filters.confidenceMin ?? "")}
          options={CONFIDENCE_OPTIONS}
          onChange={(v) => onChange({ confidenceMin: v ? Number(v) : undefined })}
        />

        {/* Status select */}
        <FilterSelect
          value={filters.status ?? ""}
          options={STATUS_OPTIONS}
          onChange={(v) => onChange({ status: v || undefined })}
        />

        {/* Sort */}
        <FilterSelect
          value={currentSort}
          options={SORT_OPTIONS}
          onChange={handleSort}
        />

        {/* Search */}
        <input
          type="text"
          placeholder="Symbol…"
          value={filters.query ?? ""}
          onChange={(e) => onChange({ query: e.target.value || undefined })}
          className="h-7 w-24 flex-shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 text-[11px] text-[#A7B4C8] placeholder:text-[#70809A] focus:border-white/20 focus:outline-none"
        />

        <div className="ml-auto flex flex-shrink-0 items-center gap-2">
          {isDirty && (
            <button
              type="button"
              onClick={() => onChange({ market: undefined, direction: undefined, confidenceMin: undefined, status: undefined, query: undefined })}
              className="text-[11px] text-[#70809A] transition-colors hover:text-[#A7B4C8]"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
