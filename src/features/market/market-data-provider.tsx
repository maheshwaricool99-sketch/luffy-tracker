"use client";

import { ReactNode, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { DEFAULT_INTERVAL, DEFAULT_PAIR, normalizeInterval, normalizePair } from "@/features/market/config";
import { STATIC_SYMBOLS } from "@/config/symbols";
import { ConnectionStatus, KlinePoint } from "@/features/market/types";
import { useTerminalStore } from "@/store/terminal-store";

const MAX_KLINES = 120;
const STALE_TIMEOUT_MS = 15000;
const MAX_RECONNECT_MS = 10000;
const UI_FLUSH_MS = 1000;
const DEBUG_MARKET = false;

function debugLog(...args: unknown[]) {
  if (DEBUG_MARKET) console.debug(...args);
}

function parseNumber(value: string | number | undefined): number {
  if (typeof value === "number") {
    return value;
  }
  if (!value) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapKlineTuple(raw: unknown): KlinePoint | null {
  if (!Array.isArray(raw) || raw.length < 7) {
    return null;
  }

  return {
    openTime: Number(raw[0]),
    open: parseNumber(raw[1] as string),
    high: parseNumber(raw[2] as string),
    low: parseNumber(raw[3] as string),
    close: parseNumber(raw[4] as string),
    volume: parseNumber(raw[5] as string),
    closeTime: Number(raw[6]),
    isClosed: true,
  };
}

export function MarketDataProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const actions = useTerminalStore((state) => state.actions);
  const selectedPair = normalizePair(searchParams.get("pair") ?? DEFAULT_PAIR);
  const selectedInterval = normalizeInterval(searchParams.get("timeframe") ?? searchParams.get("tf") ?? DEFAULT_INTERVAL);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const isIntentionalCloseRef = useRef(false);
  const connectRef = useRef<() => void>(() => {});
  const firstRawKlineLoggedRef = useRef(false);
  const restAbortRef = useRef<AbortController | null>(null);
  const symbolsAbortRef = useRef<AbortController | null>(null);
  const candleLogCounterRef = useRef(0);

  useEffect(() => {
    actions.setSelection(selectedPair, selectedInterval);
  }, [actions, selectedInterval, selectedPair]);

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (staleTimeoutRef.current) {
      clearTimeout(staleTimeoutRef.current);
      staleTimeoutRef.current = null;
    }
  }, []);

  const closeSocket = useCallback(() => {
    if (!socketRef.current) {
      return;
    }
    socketRef.current.onopen = null;
    socketRef.current.onmessage = null;
    socketRef.current.onerror = null;
    socketRef.current.onclose = null;
    socketRef.current.close();
    socketRef.current = null;
  }, []);

  const resetStaleTimer = useCallback(() => {
    if (staleTimeoutRef.current) {
      clearTimeout(staleTimeoutRef.current);
    }
    staleTimeoutRef.current = setTimeout(() => {
      debugLog("[MarketWS] stale stream detected; forcing reconnect", {
        pair: selectedPair,
        timeframe: selectedInterval,
      });
      socketRef.current?.close();
    }, STALE_TIMEOUT_MS);
  }, [selectedInterval, selectedPair]);

  const scheduleReconnect = useCallback(() => {
    if (isIntentionalCloseRef.current) {
      return;
    }

    reconnectAttemptRef.current += 1;
    const delay = Math.min(1000 * 2 ** (reconnectAttemptRef.current - 1), MAX_RECONNECT_MS);
    actions.setConnectionStatus("reconnecting");

    debugLog("[MarketWS] reconnect scheduled", {
      pair: selectedPair,
      timeframe: selectedInterval,
      attempt: reconnectAttemptRef.current,
      delay,
    });

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectTimeoutRef.current = setTimeout(() => {
      connectRef.current();
    }, delay);
  }, [actions, selectedInterval, selectedPair]);

  const handleIncoming = useCallback(
    (rawEvent: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(rawEvent.data) as { data?: unknown; e?: string; s?: string };
        const data = (parsed.data ?? parsed) as {
          e?: string;
          s?: string;
          p?: string;
          k?: { t: number; T: number; o: string; h: string; l: string; c: string; v: string; x: boolean };
        };

        if (data.e === "markPriceUpdate" && data.s === selectedPair && data.p) {
          actions.pushMarketTick({ price: parseNumber(data.p) });
        }

        if (data.e === "kline" && data.s === selectedPair && data.k) {
          if (!firstRawKlineLoggedRef.current) {
            debugLog("[MarketWS] first raw kline message", {
              pair: selectedPair,
              timeframe: selectedInterval,
              payload: rawEvent.data,
            });
            firstRawKlineLoggedRef.current = true;
          }

          const kline: KlinePoint = {
            openTime: data.k.t,
            closeTime: data.k.T,
            open: parseNumber(data.k.o),
            high: parseNumber(data.k.h),
            low: parseNumber(data.k.l),
            close: parseNumber(data.k.c),
            volume: parseNumber(data.k.v),
            isClosed: data.k.x,
          };

          actions.pushMarketTick({ kline });
          candleLogCounterRef.current += 1;
          if (candleLogCounterRef.current % 25 === 0) {
            debugLog("[MarketWS] candle update count", { count: candleLogCounterRef.current });
          }
        }

        resetStaleTimer();
      } catch (error) {
        debugLog("[MarketWS] failed to parse message", error);
      }
    },
    [actions, resetStaleTimer, selectedInterval, selectedPair],
  );

  const hydrateKlines = useCallback(async () => {
    if (restAbortRef.current) {
      restAbortRef.current.abort();
    }
    const controller = new AbortController();
    restAbortRef.current = controller;
    const restUrl = `https://fapi.binance.com/fapi/v1/klines?symbol=${selectedPair}&interval=${selectedInterval}&limit=${MAX_KLINES}`;

    debugLog("[MarketWS] hydrating futures klines", { pair: selectedPair, timeframe: selectedInterval, restUrl });

    try {
      const response = await fetch(restUrl, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) {
        throw new Error(`REST hydration failed with status ${response.status}`);
      }

      const payload = (await response.json()) as unknown[];
      const next = payload.map(mapKlineTuple).filter((item): item is KlinePoint => item !== null);
      actions.hydrateRawKlines(next);
      actions.setRawError(null);
      debugLog("[MarketWS] REST hydration parsed candles", { pair: selectedPair, timeframe: selectedInterval, count: next.length });
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      actions.setRawError("Failed to hydrate initial futures candles.");
      debugLog("[MarketWS] REST hydration error", error);
    }
  }, [actions, selectedInterval, selectedPair]);

  useEffect(() => {
    if (symbolsAbortRef.current) {
      symbolsAbortRef.current.abort();
    }
    const controller = new AbortController();
    symbolsAbortRef.current = controller;
    actions.setPairsLoading(true);

    const loadSymbols = async () => {
      try {
        const response = await fetch("https://fapi.binance.com/fapi/v1/exchangeInfo", { signal: controller.signal, cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Pair catalog failed with status ${response.status}`);
        }
        const payload = (await response.json()) as {
          symbols?: Array<{ symbol?: string; status?: string; contractType?: string; quoteAsset?: string }>;
        };
        const symbols =
          payload.symbols
            ?.filter(
              (item: { symbol?: string; status?: string; contractType?: string; quoteAsset?: string }) =>
                item.quoteAsset === "USDT" &&
                item.contractType === "PERPETUAL" &&
                item.status === "TRADING" &&
                typeof item.symbol === "string" &&
                item.symbol.endsWith("USDT"),
            )
            .map((item) => item.symbol as string)
            .sort((a, b) => a.localeCompare(b)) ?? [];

        actions.setPairsCatalog(symbols.length > 0 ? symbols : STATIC_SYMBOLS, false, symbols.length > 0 ? null : "No pairs returned.");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        actions.setPairsCatalog(STATIC_SYMBOLS, false, "Failed to load pair catalog; using fallback.");
        debugLog("[MarketWS] futures pair catalog error", error);
      }
    };

    loadSymbols();
    return () => controller.abort();
  }, [actions]);

  const connect = useCallback(() => {
    clearTimers();
    closeSocket();
    const streamPair = selectedPair.toLowerCase();
    const streamUrl = `wss://fstream.binance.com/stream?streams=${streamPair}@markPrice@1s/${streamPair}@kline_${selectedInterval}`;
    debugLog("[MarketWS] stream context", { pair: selectedPair, timeframe: selectedInterval, streamUrl });

    const socket = new WebSocket(streamUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      reconnectAttemptRef.current = 0;
      actions.setConnectionStatus("connected");
      actions.setRawError(null);
      debugLog("[MarketWS] open", { pair: selectedPair, timeframe: selectedInterval });
      resetStaleTimer();
    };

    socket.onmessage = handleIncoming;

    socket.onerror = () => {
      actions.setConnectionStatus("error");
      actions.setRawError("Kline stream error. Reconnecting...");
      debugLog("[MarketWS] error", { pair: selectedPair, timeframe: selectedInterval });
    };

    socket.onclose = (event: CloseEvent) => {
      if (isIntentionalCloseRef.current) {
        return;
      }
      actions.setConnectionStatus("disconnected");
      const hasKlineData = useTerminalStore.getState().market.hasKlineDataRaw;
      if (!hasKlineData) {
        actions.setRawError(`Stream closed (${event.code}). Retrying...`);
      }
      debugLog("[MarketWS] close", { pair: selectedPair, timeframe: selectedInterval, code: event.code, reason: event.reason });
      scheduleReconnect();
    };
  }, [actions, clearTimers, closeSocket, handleIncoming, resetStaleTimer, scheduleReconnect, selectedInterval, selectedPair]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    let flushCount = 0;
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      actions.flushUiSnapshot();
      flushCount += 1;
      if (flushCount % 20 === 0) {
        debugLog("[UI] market snapshot flush", { count: flushCount, cadenceMs: UI_FLUSH_MS });
      }
    }, UI_FLUSH_MS);
    return () => clearInterval(timer);
  }, [actions]);

  useEffect(() => {
    isIntentionalCloseRef.current = false;
    firstRawKlineLoggedRef.current = false;
    candleLogCounterRef.current = 0;

    const timer = setTimeout(() => {
      actions.setConnectionStatus("connecting");
      actions.hydrateRawKlines([]);
      actions.setRawError(null);
      reconnectAttemptRef.current = 0;
      hydrateKlines();
      connect();
    }, 0);

    return () => {
      clearTimeout(timer);
      isIntentionalCloseRef.current = true;
      clearTimers();
      if (restAbortRef.current) {
        restAbortRef.current.abort();
        restAbortRef.current = null;
      }
      closeSocket();
    };
  }, [actions, clearTimers, closeSocket, connect, hydrateKlines]);

  return <>{children}</>;
}

export function useMarketData() {
  const snapshot = useTerminalStore(useShallow((state) => ({
    selectedPair: state.market.selectedPair,
    selectedInterval: state.market.selectedInterval,
    availablePairs: state.market.availablePairs,
    pairsLoading: state.market.pairsLoading,
    pairsError: state.market.pairsError,
    connectionStatus: state.market.connectionStatus,
    livePrice: state.market.livePriceUi,
    klines: state.market.klinesUi,
    lastUpdate: state.market.lastUpdateUi,
    hasKlineData: state.market.hasKlineDataUi,
    klineError: state.market.klineErrorUi,
  })));

  return {
    ...snapshot,
    connectionStatus: snapshot.connectionStatus as ConnectionStatus,
  };
}
