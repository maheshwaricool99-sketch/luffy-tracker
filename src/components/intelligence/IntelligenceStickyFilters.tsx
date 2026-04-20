"use client";

import { useCallback } from "react";
import { cn } from "@/lib/cn";
import type { IntelligenceFilters } from "@/lib/intelligence/types";
import type { MarketType, SignalDirection } from "@/lib/signals/types/signalEnums";

const MARKETS: { label: string; value: MarketType | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Crypto", value: "CRYPTO" },
  { label: "US", value: "US" },
  { label: "India", value: "INDIA" },
];

const DIRECTIONS: { label: string; value: SignalDirection | "ALL" }[] = [
  { label: "Both", value: "ALL" },
  { label: "Long", value: "LONG" },
  { label: "Short", value: "SHORT" },
];

const TIMEFRAMES = ["ALL", "15m", "1H", "4H", "1D", "1W"];

const SORT_OPTIONS: { label: string; value: NonNullable<IntelligenceFilters["sortBy"]> }[] = [
  { label: "Highest Score", value: "score" },
  { label: "Confidence", value: "confidence" },
  { label: "Freshest", value: "freshness" },
  { label: "Best R/R", value: "rr" },
  { label: "Most Aligned", value: "strategies" },
  { label: "Actionable", value: "actionability" },
  { label: "Trend Strength", value: "trend" },
  { label: "Recent", value: "recent" },
];

function PillButton({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors whitespace-nowrap",
        active
          ? "border-[#5B8CFF]/50 bg-[#5B8CFF]/20 text-[#F3F7FF]"
          : "border-white/[0.08] bg-transparent text-[#70809A] hover:border-white/15 hover:text-[#A7B4C8]",
        className,
      )}
    >
      {children}
    </button>
  );
}

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      placeholder="Symbol…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[12px] text-[#A7B4C8] placeholder:text-[#70809A] focus:border-white/20 focus:outline-none w-24"
    />
  );
}

function SelectFilter({
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
      className="rounded-lg border border-white/[0.08] bg-[#0B1728] px-2.5 py-1.5 text-[12px] text-[#A7B4C8] focus:border-white/20 focus:outline-none"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

interface IntelligenceStickyFiltersProps {
  filters: IntelligenceFilters;
  onChange: (partial: Partial<IntelligenceFilters>) => void;
  onReset: () => void;
  isAdmin?: boolean;
  isPremium?: boolean;
  totalCount: number;
  filteredCount: number;
}

export function IntelligenceStickyFilters({
  filters,
  onChange,
  onReset,
  isAdmin,
  isPremium,
  totalCount,
  filteredCount,
}: IntelligenceStickyFiltersProps) {
  const setMarket = useCallback((v: MarketType | "ALL") => onChange({ market: v }), [onChange]);
  const setDirection = useCallback((v: SignalDirection | "ALL") => onChange({ direction: v }), [onChange]);

  const isDirty =
    filters.market !== "ALL" ||
    filters.direction !== "ALL" ||
    filters.query ||
    filters.onlyPremiumGrade ||
    filters.onlyLive ||
    filters.onlyMultiStrategy ||
    filters.onlyAdminReviewed;

  return (
    <div className="sticky top-0 z-30 border-b border-white/[0.06] bg-[rgba(6,17,31,0.92)] backdrop-blur-sm">
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2.5 scrollbar-none sm:flex-wrap sm:px-5">
        {/* Market */}
        <div className="flex items-center gap-1">
          {MARKETS.map((m) => (
            <PillButton key={m.value} active={filters.market === m.value} onClick={() => setMarket(m.value)}>
              {m.label}
            </PillButton>
          ))}
        </div>

        <div className="h-4 w-px bg-white/10" />

        {/* Direction */}
        <div className="flex items-center gap-1">
          {DIRECTIONS.map((d) => (
            <PillButton key={d.value} active={filters.direction === d.value} onClick={() => setDirection(d.value)}>
              {d.label}
            </PillButton>
          ))}
        </div>

        <div className="h-4 w-px bg-white/10" />

        {/* Timeframe */}
        <SelectFilter
          value={filters.timeframe ?? "ALL"}
          options={TIMEFRAMES.map((tf) => ({ label: tf === "ALL" ? "Any TF" : tf, value: tf }))}
          onChange={(v) => onChange({ timeframe: v === "ALL" ? undefined : v })}
        />

        {/* Sort */}
        <SelectFilter
          value={filters.sortBy ?? "score"}
          options={SORT_OPTIONS}
          onChange={(v) => onChange({ sortBy: v as IntelligenceFilters["sortBy"] })}
        />

        {/* Search */}
        <SearchInput value={filters.query ?? ""} onChange={(v) => onChange({ query: v || undefined })} />

        {/* Premium filters */}
        {isPremium && (
          <>
            <PillButton
              active={filters.onlyLive}
              onClick={() => onChange({ onlyLive: !filters.onlyLive })}
            >
              Live only
            </PillButton>
            <PillButton
              active={filters.onlyMultiStrategy}
              onClick={() => onChange({ onlyMultiStrategy: !filters.onlyMultiStrategy })}
            >
              Multi-strategy
            </PillButton>
          </>
        )}

        <PillButton
          active={filters.onlyPremiumGrade}
          onClick={() => onChange({ onlyPremiumGrade: !filters.onlyPremiumGrade })}
        >
          Premium grade
        </PillButton>

        {/* Admin toggle */}
        {isAdmin && (
          <PillButton
            active={filters.onlyAdminReviewed}
            onClick={() => onChange({ onlyAdminReviewed: !filters.onlyAdminReviewed })}
          >
            Admin reviewed
          </PillButton>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[11px] text-[#70809A]">
            {filteredCount < totalCount ? `${filteredCount} of ${totalCount}` : totalCount} signals
          </span>
          {isDirty && (
            <button
              onClick={onReset}
              className="text-[11px] text-[#70809A] hover:text-[#A7B4C8] transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
