/**
 * TRADE STORE
 *
 * Single source of truth for all trade lifecycle state.
 * In-memory with atomic file-backed persistence.
 * Repository interface ready for SQLite/Postgres migration.
 */

import fs from "node:fs";
import path from "node:path";
import type { Trade, TradeStatus, CloseReason, EngineId } from "./types";
import { newId } from "./types";

// ── Persistence ───────────────────────────────────────────────────────────────

const RUNTIME_DIR  = path.join(process.cwd(), ".runtime");
const STORE_PATH   = path.join(RUNTIME_DIR, "portfolio-trades.json");
const MAX_CLOSED   = 500; // keep last N closed trades in memory

function persistSync(state: TradeStoreState): void {
  try {
    if (!fs.existsSync(RUNTIME_DIR)) fs.mkdirSync(RUNTIME_DIR, { recursive: true });
    const tmp = `${STORE_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state), "utf8");
    fs.renameSync(tmp, STORE_PATH);
  } catch { /* never crash engine */ }
}

function loadFromDisk(): TradeStoreState {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf8");
      return JSON.parse(raw) as TradeStoreState;
    }
  } catch { /* start fresh */ }
  return { open: {}, closed: [], dailyStartUsd: 0, dayStamp: "" };
}

// ── State ─────────────────────────────────────────────────────────────────────

type TradeStoreState = {
  open: Record<string, Trade>;      // tradeId → Trade (only OPEN trades)
  closed: Trade[];                  // last MAX_CLOSED closed trades
  dailyStartUsd: number;            // equity at start of trading day
  dayStamp: string;                 // "YYYY-MM-DD" of current day
};

const _state: TradeStoreState = loadFromDisk();

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function maybeFreshDay(): void {
  const today = todayStamp();
  if (_state.dayStamp !== today) {
    _state.dailyStartUsd = computeEquity();
    _state.dayStamp = today;
  }
}

let _persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist(): void {
  if (_persistTimer) return;
  _persistTimer = setTimeout(() => {
    _persistTimer = null;
    persistSync(_state);
  }, 500);
}

// ── Equity helpers ────────────────────────────────────────────────────────────

function computeEquity(): number {
  const realized = _state.closed.reduce((s, t) => s + (t.realizedPnlUsd ?? 0), 0);
  const unrealized = Object.values(_state.open).reduce((s, t) => s + t.unrealizedPnlUsd, 0);
  return 10_000 + realized + unrealized; // base paper equity
}

// ── Repository interface ──────────────────────────────────────────────────────

export const tradeStore = {
  /** Open a new trade record. Returns the created Trade. */
  open(params: {
    claimId: string;
    candidateId: string;
    sourceEngine: EngineId;
    symbol: string;
    side: "LONG" | "SHORT";
    setupType: string;
    timeframe: string;
    entryPrice: number;
    stopPrice: number;
    targetPrice: number;
    quantity: number;
    notionalUsd: number;
    marginUsd: number;
    entryFeeUsd?: number;
    signalEntry?: string;
    note?: string;
  }): Trade {
    maybeFreshDay();
    const now = Date.now();
    const trade: Trade = {
      id: newId("trd"),
      claimId: params.claimId,
      candidateId: params.candidateId,
      sourceEngine: params.sourceEngine,
      symbol: params.symbol,
      side: params.side,
      status: "open",
      setupType: params.setupType,
      timeframe: params.timeframe,
      entryPrice: params.entryPrice,
      stopPrice: params.stopPrice,
      targetPrice: params.targetPrice,
      currentPrice: params.entryPrice,
      quantity: params.quantity,
      notionalUsd: params.notionalUsd,
      marginUsd: params.marginUsd,
      entryFeeUsd: params.entryFeeUsd ?? 0,
      unrealizedPnlUsd: 0,
      openedAtMs: now,
      lastUpdateMs: now,
      signalEntry: params.signalEntry,
      note: params.note,
    };
    _state.open[trade.id] = trade;
    schedulePersist();
    return trade;
  },

  /** Update current price and unrealized PnL for an open trade. */
  updatePrice(tradeId: string, currentPrice: number): Trade | null {
    const trade = _state.open[tradeId];
    if (!trade || trade.status !== "open") return null;

    const priceDelta =
      trade.side === "LONG"
        ? currentPrice - trade.entryPrice
        : trade.entryPrice - currentPrice;

    const unrealizedPnlUsd = priceDelta * trade.quantity;
    trade.currentPrice = currentPrice;
    trade.unrealizedPnlUsd = unrealizedPnlUsd;
    trade.lastUpdateMs = Date.now();

    if (unrealizedPnlUsd > (trade.peakUnrealizedUsd ?? -Infinity)) {
      trade.peakUnrealizedUsd = unrealizedPnlUsd;
    }
    if (unrealizedPnlUsd < (trade.troughUnrealizedUsd ?? Infinity)) {
      trade.troughUnrealizedUsd = unrealizedPnlUsd;
    }

    schedulePersist();
    return trade;
  },

  /** Close a trade — moves from open to closed. */
  close(tradeId: string, params: {
    closePrice: number;
    closeReason: CloseReason;
    closeDetail?: string;
  }): Trade | null {
    const trade = _state.open[tradeId];
    if (!trade) return null;

    const priceDelta =
      trade.side === "LONG"
        ? params.closePrice - trade.entryPrice
        : trade.entryPrice - params.closePrice;

    const realizedPnlUsd = priceDelta * trade.quantity;
    const closedTrade: Trade = {
      ...trade,
      status: "closed",
      currentPrice: params.closePrice,
      realizedPnlUsd,
      unrealizedPnlUsd: 0,
      pnlPct: trade.entryPrice > 0 ? (priceDelta / trade.entryPrice) * 100 : 0,
      rr: Math.abs(trade.entryPrice - trade.stopPrice) > 0
        ? Math.abs(priceDelta) / Math.abs(trade.entryPrice - trade.stopPrice) * (realizedPnlUsd >= 0 ? 1 : -1)
        : 0,
      closedAtMs: Date.now(),
      lastUpdateMs: Date.now(),
      closeReason: params.closeReason,
      closeDetail: params.closeDetail,
    };

    delete _state.open[tradeId];
    _state.closed.unshift(closedTrade);
    if (_state.closed.length > MAX_CLOSED) _state.closed = _state.closed.slice(0, MAX_CLOSED);

    schedulePersist();
    return closedTrade;
  },

  /** Get a single open trade by ID. */
  getOpen(tradeId: string): Trade | null {
    return _state.open[tradeId] ?? null;
  },

  /** All open trades. */
  allOpen(): Trade[] {
    return Object.values(_state.open);
  },

  /** Open trades for a specific engine. */
  openByEngine(engine: EngineId): Trade[] {
    return Object.values(_state.open).filter((t) => t.sourceEngine === engine);
  },

  /** Open trades for a specific symbol. */
  openBySymbol(symbol: string): Trade[] {
    return Object.values(_state.open).filter((t) => t.symbol === symbol);
  },

  /** Recent closed trades (newest first). */
  recentClosed(limit = 50): Trade[] {
    return _state.closed.slice(0, limit);
  },

  /** Closed trades for a specific engine. */
  closedByEngine(engine: EngineId, limit = 50): Trade[] {
    return _state.closed.filter((t) => t.sourceEngine === engine).slice(0, limit);
  },

  /** Combined open + recent closed for a specific engine (for UI display). */
  historyByEngine(engine: EngineId, closedLimit = 20): Trade[] {
    const open = this.openByEngine(engine);
    const closed = this.closedByEngine(engine, closedLimit);
    return [...open, ...closed];
  },

  /** Realized PnL today. */
  dailyRealizedPnl(): number {
    maybeFreshDay();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return _state.closed
      .filter((t) => (t.closedAtMs ?? 0) >= todayStart.getTime())
      .reduce((s, t) => s + (t.realizedPnlUsd ?? 0), 0);
  },

  /** Total unrealized PnL across all open trades. */
  totalUnrealizedPnl(): number {
    return Object.values(_state.open).reduce((s, t) => s + t.unrealizedPnlUsd, 0);
  },

  /** Total realized PnL across all closed trades in memory. */
  totalRealizedPnl(): number {
    return _state.closed.reduce((s, t) => s + (t.realizedPnlUsd ?? 0), 0);
  },

  /** Paper equity = base + realized + unrealized. */
  equity(): number {
    return computeEquity();
  },

  stats(): {
    openCount: number;
    closedCount: number;
    equity: number;
    dailyPnl: number;
    unrealizedPnl: number;
    realizedPnl: number;
  } {
    const daily = this.dailyRealizedPnl();
    const unrealized = this.totalUnrealizedPnl();
    const realized = this.totalRealizedPnl();
    return {
      openCount: Object.keys(_state.open).length,
      closedCount: _state.closed.length,
      equity: computeEquity(),
      dailyPnl: daily,
      unrealizedPnl: unrealized,
      realizedPnl: realized,
    };
  },
};

// Export type for lazy import in portfolio-state.ts (avoids circular dep at load time)
export type TradeStorePublic = typeof tradeStore;
