"use client";

import type { PerformanceApiResponse } from "@/lib/performance/types";
import { usePerformanceFilters } from "../hooks/usePerformanceFilters";

const OPTIONS = {
  market: [["all", "All Markets"], ["crypto", "Crypto"], ["us", "US"], ["india", "India"]],
  class: [["all", "All Classes"], ["elite", "Elite"], ["strong", "Strong"], ["watchlist", "Watchlist"]],
  confidenceBucket: [["all", "All Confidence"], ["90plus", "90+"], ["80to89", "80-89"], ["70to79", "70-79"], ["lt70", "<70"]],
  range: [["7d", "7D"], ["30d", "30D"], ["90d", "90D"], ["all", "All"]],
  source: [["all", "All Sources"], ["live", "Live"], ["snapshot", "Snapshot"], ["delayed", "Delayed"]],
} as const;

export function TradesFilters({ data }: { data: PerformanceApiResponse }) {
  const { filters, updateFilter } = usePerformanceFilters();

  if (!data.meta.canUseFilters) return null;

  return (
    <section className="rounded-[24px] border border-white/10 bg-[#091321] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
        <FilterSelect label="Market" value={filters.market} onChange={(value) => updateFilter("market", value)} options={OPTIONS.market} />
        <FilterSelect label="Class" value={filters.class} onChange={(value) => updateFilter("class", value)} options={OPTIONS.class} />
        <FilterSelect label="Confidence" value={filters.confidenceBucket} onChange={(value) => updateFilter("confidenceBucket", value)} options={OPTIONS.confidenceBucket} />
        <FilterSelect label="Range" value={filters.range} onChange={(value) => updateFilter("range", value)} options={OPTIONS.range} />
        <FilterSelect label="Source" value={filters.source} onChange={(value) => updateFilter("source", value)} options={OPTIONS.source} />
        {data.meta.role === "ADMIN" ? (
          <label className="flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-[#DCE7F4] lg:ml-auto">
            <input
              type="checkbox"
              checked={filters.includeAdmin === "true"}
              onChange={(event) => updateFilter("includeAdmin", event.target.checked ? "true" : "false")}
            />
            Admin debug
          </label>
        ) : null}
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <label className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 sm:min-w-[148px] lg:w-auto">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[#6F8298]">{label}</div>
      <select
        className="mt-1 w-full bg-transparent text-sm text-[#F3F7FF] outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue} className="bg-[#091321] text-[#F3F7FF]">
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
