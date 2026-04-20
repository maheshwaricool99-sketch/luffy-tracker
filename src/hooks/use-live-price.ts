"use client";

import { useEffect, useMemo, useState } from "react";

export interface LivePriceSnapshot {
  connected: boolean;
  price: number | null;
  timestamp: number | null;
  stale: boolean;
  status: string;
}

export function useLivePrice(symbol: string, enabled = true): LivePriceSnapshot {
  const [state, setState] = useState<LivePriceSnapshot>({
    connected: false,
    price: null,
    timestamp: null,
    stale: false,
    status: "WATCHING",
  });

  useEffect(() => {
    if (!enabled) return;
    let source: EventSource | null = null;
    let retries = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      source = new EventSource(`/api/analysis/${encodeURIComponent(symbol)}/stream`);

      source.addEventListener("price", (event) => {
        const payload = JSON.parse((event as MessageEvent).data) as { price?: number; timestamp?: number };
        setState((prev) => ({
          ...prev,
          connected: true,
          price: typeof payload.price === "number" ? payload.price : prev.price,
          timestamp: typeof payload.timestamp === "number" ? payload.timestamp : Date.now(),
          stale: false,
        }));
      });

      source.addEventListener("status", (event) => {
        const payload = JSON.parse((event as MessageEvent).data) as { status?: string; stale?: boolean };
        setState((prev) => ({
          ...prev,
          connected: true,
          status: payload.status ?? prev.status,
          stale: Boolean(payload.stale),
        }));
      });

      source.addEventListener("heartbeat", () => {
        setState((prev) => ({ ...prev, connected: true }));
      });

      source.onerror = () => {
        source?.close();
        setState((prev) => ({ ...prev, connected: false, stale: true }));
        retries += 1;
        if (retries > 10) return;
        const delayMs = Math.min(30_000, 500 * 2 ** retries);
        timer = setTimeout(connect, delayMs);
      };
    };

    connect();

    return () => {
      source?.close();
      if (timer) clearTimeout(timer);
    };
  }, [symbol, enabled]);

  return useMemo(() => state, [state]);
}
