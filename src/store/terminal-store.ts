"use client";

import { create } from "zustand";
import { KlinePoint, ConnectionStatus } from "@/features/market/types";
import { STATIC_SYMBOLS } from "@/config/symbols";

const MAX_KLINES = 120;

type TerminalStoreState = {
  market: {
    selectedPair: string;
    selectedInterval: string;
    availablePairs: string[];
    pairsLoading: boolean;
    pairsError: string | null;
    connectionStatus: ConnectionStatus;
    livePriceRaw: number | null;
    klinesRaw: KlinePoint[];
    lastUpdateRaw: number | null;
    hasKlineDataRaw: boolean;
    klineErrorRaw: string | null;
    candleUpdateCount: number;
    livePriceUi: number | null;
    klinesUi: KlinePoint[];
    lastUpdateUi: number | null;
    hasKlineDataUi: boolean;
    klineErrorUi: string | null;
  };
  ui: {
    renderPulse: number;
  };
  actions: {
    setSelection: (pair: string, interval: string) => void;
    setPairsCatalog: (pairs: string[], loading: boolean, error: string | null) => void;
    setPairsLoading: (loading: boolean) => void;
    setConnectionStatus: (status: ConnectionStatus) => void;
    setRawError: (message: string | null) => void;
    hydrateRawKlines: (klines: KlinePoint[]) => void;
    pushMarketTick: (payload: { price?: number | null; kline?: KlinePoint }) => void;
    flushUiSnapshot: () => void;
    pulseRender: () => void;
  };
};

type TerminalStoreActions = TerminalStoreState["actions"];

export const useTerminalStore = create<TerminalStoreState>()((set) => ({
  market: {
    selectedPair: "BTCUSDT",
    selectedInterval: "4h",
    availablePairs: STATIC_SYMBOLS,
    pairsLoading: true,
    pairsError: null,
    connectionStatus: "connecting",
    livePriceRaw: null,
    klinesRaw: [],
    lastUpdateRaw: null,
    hasKlineDataRaw: false,
    klineErrorRaw: null,
    candleUpdateCount: 0,
    livePriceUi: null,
    klinesUi: [],
    lastUpdateUi: null,
    hasKlineDataUi: false,
    klineErrorUi: null,
  },
  ui: {
    renderPulse: 0,
  },
  actions: {
    setSelection: (pair, interval) =>
      set((state) => ({
        market: {
          ...state.market,
          selectedPair: pair,
          selectedInterval: interval,
        },
      })),
    setPairsCatalog: (pairs, loading, error) =>
      set((state) => ({
        market: {
          ...state.market,
          availablePairs: pairs,
          pairsLoading: loading,
          pairsError: error,
        },
      })),
    setPairsLoading: (loading) =>
      set((state) => ({
        market: {
          ...state.market,
          pairsLoading: loading,
        },
      })),
    setConnectionStatus: (status) =>
      set((state) => ({
        market: {
          ...state.market,
          connectionStatus: status,
        },
      })),
    setRawError: (message) =>
      set((state) => ({
        market: {
          ...state.market,
          klineErrorRaw: message,
        },
      })),
    hydrateRawKlines: (klines) =>
      set((state) => ({
        market: {
          ...state.market,
          klinesRaw: klines.slice(-MAX_KLINES),
          hasKlineDataRaw: klines.length > 0,
          lastUpdateRaw: Date.now(),
          klineErrorRaw: null,
          candleUpdateCount: state.market.candleUpdateCount + klines.length,
        },
      })),
    pushMarketTick: ({ price, kline }) =>
      set((state) => {
        const next = { ...state.market };
        if (typeof price === "number") {
          next.livePriceRaw = price;
          next.lastUpdateRaw = Date.now();
        }

        if (kline) {
          if (next.klinesRaw.length === 0) {
            next.klinesRaw = [kline];
          } else {
            const current = next.klinesRaw[next.klinesRaw.length - 1];
            if (current.openTime === kline.openTime) {
              next.klinesRaw = [...next.klinesRaw.slice(0, -1), kline];
            } else {
              next.klinesRaw = [...next.klinesRaw, kline].slice(-MAX_KLINES);
            }
          }
          next.hasKlineDataRaw = true;
          next.klineErrorRaw = null;
          next.lastUpdateRaw = Date.now();
          next.candleUpdateCount = next.candleUpdateCount + 1;
        }

        return { market: next };
      }),
    flushUiSnapshot: () =>
      set((state) => ({
        market: {
          ...state.market,
          livePriceUi: state.market.livePriceRaw,
          klinesUi: state.market.klinesRaw,
          lastUpdateUi: state.market.lastUpdateRaw,
          hasKlineDataUi: state.market.hasKlineDataRaw,
          klineErrorUi: state.market.klineErrorRaw,
        },
      })),
    pulseRender: () =>
      set((state) => ({
        ui: {
          ...state.ui,
          renderPulse: state.ui.renderPulse + 1,
        },
      })),
  } satisfies TerminalStoreActions,
}));

export function getTerminalStoreState() {
  return useTerminalStore.getState();
}
