"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function usePerformanceFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => ({
    market: searchParams.get("market") ?? "all",
    class: searchParams.get("class") ?? "all",
    confidenceBucket: searchParams.get("confidenceBucket") ?? "all",
    range: searchParams.get("range") ?? "30d",
    source: searchParams.get("source") ?? "all",
    page: searchParams.get("page") ?? "1",
    pageSize: searchParams.get("pageSize") ?? "10",
    includeAdmin: searchParams.get("includeAdmin") ?? "false",
  }), [searchParams]);

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all" || (key === "includeAdmin" && value === "false")) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    if (key !== "page") params.set("page", "1");
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return { filters, updateFilter };
}
