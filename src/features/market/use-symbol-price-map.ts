"use client";

import { useEffect, useMemo, useState } from "react";

type PriceMapResponse = {
  prices?: Record<string, number>;
  updatedAt?: number;
};

function normalizeSymbol(symbol: string | null | undefined) {
  return String(symbol ?? "").trim().toUpperCase();
}

export function useSymbolPriceMap(
  symbols: Array<string | null | undefined>,
  options?: { primarySymbol?: string | null; primaryPrice?: number | null; pollMs?: number },
) {
  const normalizedSymbols = useMemo(
    () => [...new Set(symbols.map((symbol) => normalizeSymbol(symbol)).filter(Boolean))],
    [symbols],
  );
  const primarySymbol = normalizeSymbol(options?.primarySymbol);
  const pollMs = options?.pollMs ?? 15_000;
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  const [updatedAt, setUpdatedAt] = useState(0);

  useEffect(() => {
    let alive = true;
    let controller: AbortController | null = null;

    async function load() {
      if (!alive || normalizedSymbols.length === 0) return;
      if (typeof document !== "undefined" && document.hidden) return;
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch(`/api/market-prices?symbols=${encodeURIComponent(normalizedSymbols.join(","))}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const json = (await response.json()) as PriceMapResponse;
        if (!alive) return;
        setPriceMap((prev: Record<string, number>) => ({ ...prev, ...(json.prices ?? {}) }));
        setUpdatedAt(json.updatedAt ?? Date.now());
      } catch {
        // Keep last known prices when polling fails.
      }
    }

    if (normalizedSymbols.length === 0) {
      return () => {
        alive = false;
        controller?.abort();
      };
    }

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, pollMs);
    const onVisible = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      void load();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [normalizedSymbols, pollMs]);

  const mergedPriceMap = useMemo(() => {
    if (normalizedSymbols.length === 0) {
      return {};
    }
    if (!primarySymbol || !Number.isFinite(options?.primaryPrice ?? NaN) || (options?.primaryPrice ?? 0) <= 0) {
      return priceMap;
    }
    return {
      ...priceMap,
      [primarySymbol]: options?.primaryPrice as number,
    };
  }, [normalizedSymbols.length, options?.primaryPrice, priceMap, primarySymbol]);

  const effectiveUpdatedAt = normalizedSymbols.length === 0 ? 0 : updatedAt;

  return {
    priceMap: mergedPriceMap,
    updatedAt: effectiveUpdatedAt,
  };
}
