import { submitPaperOrder } from "./paper-exchange";
import { portfolioController, buildCandidate } from "./trading/portfolio-controller";
import type { EngineId } from "./trading/types";
import { tradeStore } from "./trading/trade-store";
import { recalculateStateFromOpenTrades } from "./portfolio-state";
import { rebuildFromOpenTrades } from "./trading/global-trade-registry";
import { buildSignalsForUniverse, Difficulty, HistoryTrade, SignalItem, trackerOrder } from "@/lib/app-data";
import { buildTrendBreakoutSignals, getTrendBreakoutUniverseCount } from "@/lib/trend-breakout-engine";
import {
  getMarkPrice,
  getMarkPrices,
  getRecentPriceEnvelope,
  getOrderFills,
  getPositionQuantity,
  getPublicBanUntilMs,
  getPaperExchangeAvailability,
  isPaperExchangeConfiguredAsync,
  normalizeQuantity,
  computeFuturesOrderQuantity,
  placeMarketOrder,
  resolveTradableSymbol,
  filterTradableLiquidSymbols,
  explainSymbolEligibility,
  isWsConfirmedPrice,
} from "@/lib/paper-exchange";
import { appendSnapshotAudit, appendTradeAudit, readLatestSnapshotAudit, writeJsonAtomic } from "@/lib/trade-audit";
import fs from "node:fs";
import path from "node:path";
import { STATIC_SYMBOLS } from "../config/symbols";

type TrackerEngineSnapshot = {
  level: Difficulty;
  timeframe: string;
  signals: SignalItem[];
  history: HistoryTrade[];
  startedAtMs: number;
  lastScanMs: number;
  lastOrderMs: number;
  trackerHealthy: boolean;
  orderCapPerHour: number;
  paperExecutionConfigured: boolean;
  lastError: string | null;
  lastErrorAtMs: number;
  cooldownUntilMs: number;
  cooldownReason: string | null;
  nextScanDueMs: number;
  trackedPairs: number;
  universePairs: number;
  openPairs: number;
};

type TrackerEngineState = {
  level: Difficulty;
  timeframe: string;
  startedAtMs: number;
  lastScanMs: number;
  lastOrderMs: number;
  orders: HistoryTrade[];
  signals: SignalItem[];
  cooldownUntilMs: number;
  cooldownReason: string | null;
  nextScanDueMs: number;
  events: Array<{
    ts: number;
    type: "ENTRY" | "EXIT";
    symbol: string;
    orderId: string;
    side: "LONG" | "SHORT";
    quantity: number;
    fillPrice: number;
    feeUsd: number;
  }>;
  lastError: string | null;
  lastErrorAtMs: number;
  processing?: boolean;
  trackedPairs?: number;
  universePairs?: number;
};

const BASE_SCAN_INTERVAL_MS = 30_000;
const ACE_SCAN_INTERVAL_MS = 60_000;
const DEFAULT_TIMEFRAMES = ["4h"];
const MAX_HISTORY = Number(process.env.TRACKER_MAX_HISTORY ?? "50000");
const MAX_OPEN_TRADE_MS = 3 * 60 * 60_000;
const RISK_USD = Number(process.env.PAPER_RISK_USD ?? "5");
const PAPER_MARGIN_PER_TRADE_USD = Number(process.env.PAPER_MARGIN_PER_TRADE_USD ?? "20");
const PAPER_LEVERAGE = Number(process.env.PAPER_LEVERAGE ?? "5");
const MAX_NOTIONAL_USD = Number(process.env.PAPER_MAX_NOTIONAL_USD ?? "100");
const TRUSTED_EXECUTION_CUTOVER_MS = Date.parse("2026-04-11T17:30:00-07:00");

const PERSIST_DIR = path.join(process.cwd(), ".runtime");
const PERSIST_PATH = path.join(PERSIST_DIR, "tracker-engine-state.json");
const PERSIST_DEBOUNCE_MS = 2_000;

// ── Portfolio controller bridge ───────────────────────────────────────────────

function difficultyToEngineId(level: Difficulty): EngineId {
  if (level === "advanced") return "advanced";
  if (level === "expert")   return "expert";
  return "ace";
}

function tradeToHistoryTrade(trade: import("./trading/types").Trade): HistoryTrade {
  const fmt = (n: number) => n >= 1000 ? n.toFixed(2) : n >= 1 ? n.toFixed(4) : n.toFixed(6);
  const ts = new Date(trade.openedAtMs);
  const entryTime = `${ts.getFullYear()}-${String(ts.getMonth()+1).padStart(2,"0")}-${String(ts.getDate()).padStart(2,"0")} ${String(ts.getHours()).padStart(2,"0")}:${String(ts.getMinutes()).padStart(2,"0")}:${String(ts.getSeconds()).padStart(2,"0")}`;
  return {
    symbol: trade.symbol,
    timeframe: trade.timeframe,
    strategy: trade.setupType,
    entry: `${fmt(trade.entryPrice * 0.999)} - ${fmt(trade.entryPrice * 1.001)}`,
    stop: fmt(trade.stopPrice),
    target: fmt(trade.targetPrice),
    entryTime,
    exitTime: "--",
    status: "Open",
    rr: `${(Math.abs(trade.targetPrice - trade.entryPrice) / Math.max(0.000001, Math.abs(trade.entryPrice - trade.stopPrice))).toFixed(1)}R`,
    note: trade.note ?? `Portfolio-executed | rank=${trade.id}`,
    execution: {
      source: "paper-exchange",
      side: trade.side,
      quantity: trade.quantity,
      orderIds: [trade.id],
      entryFillPrice: trade.entryPrice,
      entryFeeUsd: trade.entryFeeUsd,
      entrySlippageUsd: 0,
    },
  };
}

// ── Engine state ──────────────────────────────────────────────────────────────

const engineState = new Map<string, TrackerEngineState>();
let engineStarted = false;
let lastPersistMs = 0;
let lastSnapshotAuditMs = 0;
const SNAPSHOT_AUDIT_INTERVAL_MS = 60_000;
const TRACKER_STAGGER_MS = 7_500;
const trackerTimers = new Map<string, NodeJS.Timeout>();

function keyFor(level: Difficulty, timeframe: string) {
  return `${level}:${timeframe}`;
}

function scanIntervalFor(level: Difficulty) {
  return level === "ace" ? ACE_SCAN_INTERVAL_MS : BASE_SCAN_INTERVAL_MS;
}

function hourlyOrderCap(level: Difficulty) {
  if (level === "easy") return 20;
  if (level === "medium") return 10;
  if (level === "advanced") return 5;
  if (level === "expert") return 5;
  return 3;
}

function maxConcurrentOpen(level: Difficulty) {
  return hourlyOrderCap(level);
}

function getActiveUniverse(_level: Difficulty, symbols: string[]) {
  return symbols;
}

function parsePrice(value: string): number {
  const parsed = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseEntryMid(entry: string): number {
  const [left, right] = entry
    .split("-")
    .map((item) => parsePrice(item.trim()))
    .filter((value) => value > 0);
  if (left && right) return (left + right) / 2;
  return left || 0;
}

function formatOrderPrice(value: number) {
  if (value >= 1000) return value.toFixed(2);
  if (value >= 1) return value.toFixed(4);
  return value.toFixed(6);
}

function parseTimestamp(value: string) {
  if (!value || value === "--") return 0;
  const parsed = Date.parse(value.replace(" ", "T"));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatTimestamp(value: number) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function stableHash(value: string) {
  return value.split("").reduce((acc, char) => ((acc * 33) + char.charCodeAt(0)) >>> 0, 17);
}

function mergeHistoryRows(base: HistoryTrade[], incoming: HistoryTrade[]) {
  const map = new Map<string, HistoryTrade>();
  for (const item of [...base, ...incoming]) {
    const orderRef = item.execution?.orderIds?.join(",") ?? "";
    map.set(`${item.symbol}:${item.strategy}:${item.entryTime}:${orderRef}:${item.stop}:${item.target}`, item);
  }
  return [...map.values()].sort((a, b) => b.entryTime.localeCompare(a.entryTime));
}

function isPaperExecutionTrade(trade: HistoryTrade) {
  return trade.execution?.source === "paper-exchange";
}

function loadPersistedState() {
  const loadFromSnapshot = (parsed: { states?: TrackerEngineState[] } | null) => {
    const now = Date.now();
    const states = Array.isArray(parsed?.states) ? parsed.states : [];
    const deduped = new Map<string, TrackerEngineState>();
    for (const state of states) {
      if (!trackerOrder.includes(state.level)) continue;
      if (!state.timeframe || typeof state.timeframe !== "string") continue;
      const cooldownUntilMs = Number((state as { cooldownUntilMs?: unknown }).cooldownUntilMs ?? 0);
      deduped.set(keyFor(state.level, state.timeframe), {
        ...state,
        orders: Array.isArray(state.orders)
          ? sanitizeOrders(
              state.orders.map((trade) =>
                trade.status === "Open"
                  ? {
                      ...trade,
                      status: "Closed" as HistoryTrade["status"],
                      exitTime: trade.exitTime === "--" ? formatTimestamp(now) : trade.exitTime,
                      note: "Recovered from stale persisted state",
                    }
                  : trade,
              ),
            ).slice(0, MAX_HISTORY)
          : [],
        signals: Array.isArray(state.signals) ? state.signals : [],
        events: Array.isArray((state as { events?: unknown }).events) ? ((state as { events: TrackerEngineState["events"] }).events).slice(-4000) : [],
        lastError: typeof (state as { lastError?: unknown }).lastError === "string" ? (state as { lastError: string }).lastError : null,
        lastErrorAtMs: Number((state as { lastErrorAtMs?: unknown }).lastErrorAtMs ?? 0),
        cooldownUntilMs: cooldownUntilMs > now ? cooldownUntilMs : 0,
        cooldownReason: cooldownUntilMs > now && typeof (state as { cooldownReason?: unknown }).cooldownReason === "string" ? (state as { cooldownReason: string }).cooldownReason : null,
        nextScanDueMs: Math.max(now, Number((state as { nextScanDueMs?: unknown }).nextScanDueMs ?? now)),
        processing: false,
      });
    }
    for (const [key, value] of deduped) engineState.set(key, value);
  };

  try {
    if (fs.existsSync(PERSIST_PATH)) {
      const raw = fs.readFileSync(PERSIST_PATH, "utf8");
      const parsed = JSON.parse(raw) as { states?: TrackerEngineState[] };
      loadFromSnapshot(parsed);
      return;
    }
    const recovered = readLatestSnapshotAudit<{ version?: number; savedAtMs?: number; states?: TrackerEngineState[] }>("tracker");
    loadFromSnapshot(recovered ?? null);
  } catch {
    const recovered = readLatestSnapshotAudit<{ version?: number; savedAtMs?: number; states?: TrackerEngineState[] }>("tracker");
    loadFromSnapshot(recovered ?? null);
  }
}

function persistState(now = Date.now()) {
  if (now - lastPersistMs < PERSIST_DEBOUNCE_MS) return;
  lastPersistMs = now;
  try {
    if (!fs.existsSync(PERSIST_DIR)) fs.mkdirSync(PERSIST_DIR, { recursive: true });
    const payload = {
      version: 2,
      savedAtMs: now,
      states: [...engineState.values()].map((state) => ({
        ...state,
        processing: undefined,
        orders: sanitizeOrders(state.orders).slice(0, MAX_HISTORY),
        events: state.events.slice(-4000),
        lastError: state.lastError,
        lastErrorAtMs: state.lastErrorAtMs,
      })),
    };
    writeJsonAtomic(PERSIST_PATH, payload);
    if (now - lastSnapshotAuditMs >= SNAPSHOT_AUDIT_INTERVAL_MS) {
      lastSnapshotAuditMs = now;
      appendSnapshotAudit("tracker", payload, now);
    }
  } catch {
    // Ignore filesystem errors.
  }
}

function createState(level: Difficulty, timeframe: string, now: number): TrackerEngineState {
  return {
    level,
    timeframe,
    startedAtMs: now,
    lastScanMs: now - scanIntervalFor(level),
    lastOrderMs: 0,
    orders: [],
    signals: [],
    cooldownUntilMs: 0,
    cooldownReason: null,
    nextScanDueMs: now,
    events: [],
    lastError: null,
    lastErrorAtMs: 0,
    processing: false,
    trackedPairs: 0,
    universePairs: level === "expert" ? getTrendBreakoutUniverseCount() : STATIC_SYMBOLS.length,
  };
}

function ensureState(level: Difficulty, timeframe: string, now = Date.now()) {
  const key = keyFor(level, timeframe);
  const existing = engineState.get(key);
  if (existing) return existing;
  const created = createState(level, timeframe, now);
  engineState.set(key, created);
  return created;
}

function setTrackerCooldown(state: TrackerEngineState, untilMs: number, reason: string | null) {
  state.cooldownUntilMs = Math.max(state.cooldownUntilMs, untilMs);
  state.cooldownReason = reason;
  if (reason) {
    state.lastError = reason;
    state.lastErrorAtMs = Date.now();
  }
}

function clearTrackerCooldown(state: TrackerEngineState, now: number) {
  if (state.cooldownUntilMs > now) return;
  state.cooldownUntilMs = 0;
  state.cooldownReason = null;
}

function enforceHourlyCaps(state: TrackerEngineState) {
  // Historical trades must never be pruned by cap logic.
  // Hourly caps are enforced at order placement time only.
  void state;
}

function isPaperTrade(trade: HistoryTrade) {
  return true;
}

function recalculateGlobalOpenTrades() {
  // Single source of truth: tradeStore, not state.orders
  const openCount = tradeStore.allOpen().length;
  (globalThis as typeof globalThis & { GLOBAL_OPEN_TRADES?: number }).GLOBAL_OPEN_TRADES = openCount;
  return openCount;
}


/**
 * Sync tracker state.orders against tradeStore.
 *
 * The portfolioController monitor loop closes trades via executionService.close()
 * which updates tradeStore but NOT the tracker's own state.orders array.
 * Without this sync, the tracker thinks all its trades are still open and will
 * never open replacements.
 *
 * Logic:
 *   - For each HistoryTrade in state.orders with status "Open" AND a portfolio orderIds,
 *     check whether the trade still exists in tradeStore.allOpen().
 *   - If not found (monitor closed it), mark it as "Closed" in state.orders so
 *     the tracker sees the freed slot and opens a replacement.
 */
function syncOrdersWithTradeStore(state: TrackerEngineState, nowMs: number): void {
  const openInStore = new Set(tradeStore.allOpen().map((t) => t.id));
  let synced = 0;
  for (const trade of state.orders) {
    if (trade.status !== "Open") continue;
    const orderIds = trade.execution?.orderIds ?? [];
    if (orderIds.length === 0) continue;
    // orderIds[0] is the tradeStore trade ID (set in tradeToHistoryTrade)
    const tradeId = orderIds[0];
    if (typeof tradeId === "string" && tradeId.startsWith("trd-") && !openInStore.has(tradeId)) {
      // Trade was closed by portfolio monitor — sync the status
      const closed = tradeStore.recentClosed(200).find((t) => t.id === tradeId);
      // Map close reason to canonical trade status so Win/Loss shows correctly in UI
      trade.status =
        closed?.closeReason === "TARGET_HIT" ? "Win"
        : closed?.closeReason === "STOP_HIT"  ? "Loss"
        : "Closed";
      trade.exitTime = closed?.closedAtMs
        ? formatTimestamp(closed.closedAtMs)
        : formatTimestamp(nowMs);
      trade.note = closed
        ? `Monitor-closed: ${closed.closeReason}${closed.closeDetail ? " — " + closed.closeDetail : ""} (pnl=$${(closed.realizedPnlUsd ?? 0).toFixed(2)})`
        : "Closed by portfolio monitor (synced from tradeStore)";
      if (trade.execution && closed) {
        const exitPrice = closed.currentPrice > 0 ? closed.currentPrice : trade.execution.entryFillPrice;
        trade.execution = {
          ...trade.execution,
          exitFillPrice: exitPrice,
          realizedPnlUsd: closed.realizedPnlUsd ?? 0,
          realizedPnlPct: closed.pnlPct ?? 0,
          exitFeeUsd: 0,
          exitSlippageUsd: 0,
          lastMarkPrice: exitPrice,
        };
      }
      synced++;
    }
  }
  if (synced > 0) {
    console.log(`[TrackerEngine:${state.level}] syncOrdersWithTradeStore: synced ${synced} monitor-closed trade(s)`);
  }
}

function isCorruptedPaperTrade(trade: HistoryTrade) {
  if (!isPaperTrade(trade) || !trade.execution) return false;
  const entryTs = parseTimestamp(trade.entryTime);
  if (entryTs > 0 && entryTs < TRUSTED_EXECUTION_CUTOVER_MS) return true;
  const qty = trade.execution.quantity;
  const entryFill = trade.execution.entryFillPrice;
  if (!Number.isFinite(qty) || !Number.isFinite(entryFill) || qty <= 0 || entryFill <= 0) return true;
  const notional = qty * entryFill;
  if (notional > MAX_NOTIONAL_USD * 1.2) return true;
  const realized = trade.execution.realizedPnlUsd;
  if (Number.isFinite(realized ?? NaN) && Math.abs(realized as number) > MAX_NOTIONAL_USD * 3) return true;
  const realizedPct = trade.execution.realizedPnlPct;
  if (Number.isFinite(realizedPct ?? NaN) && Math.abs(realizedPct as number) > 200) return true;
  return false;
}

function normalizeTradeClassification(trade: HistoryTrade): HistoryTrade {
  if (!trade.execution || trade.status === "Open") return trade;
  const realized = trade.execution.realizedPnlUsd;
  if (!Number.isFinite(realized ?? NaN)) return trade;
  if (trade.status === "Win" && (realized as number) <= 0) {
    return {
      ...trade,
      status: "Closed" as HistoryTrade["status"],
      note: "Closed by reconciliation: status corrected from Win due to non-positive realized PnL.",
    };
  }
  if (trade.status === "Loss" && (realized as number) > 0) {
    return {
      ...trade,
      status: "Closed" as HistoryTrade["status"],
      note: "Closed by reconciliation: status corrected from Loss due to positive realized PnL.",
    };
  }
  return trade;
}

function normalizeTradeTimestamps(trade: HistoryTrade): HistoryTrade {
  const now = Date.now();
  if (trade.status === "Open") {
    const entryTs = parseTimestamp(trade.entryTime);
    if (entryTs > 0 && now - entryTs > 12 * 60 * 60_000) {
      return {
        ...trade,
        status: "Closed",
        exitTime: new Date(entryTs + 3 * 60 * 60_000).toISOString().replace("T", " ").slice(0, 19),
        note: "Recovered from stale persisted open trade after restart / missed close cycle.",
      };
    }
    if (trade.exitTime !== "--") {
      return { ...trade, exitTime: "--" };
    }
    return trade;
  }
  const entryTs = parseTimestamp(trade.entryTime);
  const exitTs = parseTimestamp(trade.exitTime);
  if (entryTs > 0 && (exitTs <= 0 || exitTs < entryTs)) {
    return { ...trade, exitTime: trade.entryTime };
  }
  return trade;
}

function sanitizeOrders(orders: HistoryTrade[]) {
  return orders
    .map((trade) => normalizeTradeClassification(trade))
    .map((trade) => normalizeTradeTimestamps(trade))
    .filter((trade) => !isCorruptedPaperTrade(trade));
}

function isReduceOnlyRejected(reason: string) {
  return reason.includes("\"code\":-2022") || reason.toLowerCase().includes("reduceonly");
}

async function maybeCloseOpenTrades(state: TrackerEngineState, scanMs: number, markPrices?: Map<string, number>) {
  const openTrades = state.orders.filter((trade) => trade.status === "Open" && isPaperTrade(trade));
  const symbols = [...new Set(openTrades.map((trade) => trade.symbol))];
  const priceMap = markPrices ?? (symbols.length > 0 ? await getMarkPrices(symbols).catch(() => new Map<string, number>()) : new Map<string, number>());
  for (const trade of openTrades) {
    try {
      const entryFill = trade.execution?.entryFillPrice ?? 0;
      const qty = trade.execution?.quantity ?? 0;
      if (entryFill <= 0 || qty <= 0) continue;
      const currentNotional = entryFill * qty;

      const stop = parsePrice(trade.stop);
      const target = parsePrice(trade.target);
      const intendedEntry = parseEntryMid(trade.entry) || entryFill;
      const envelope = await getRecentPriceEnvelope(trade.symbol).catch(() => ({ mark: 0, high: 0, low: 0 }));
      const cachedMark = priceMap.get(trade.symbol) ?? await getMarkPrice(trade.symbol).catch(() => 0);
      const mark = envelope.mark > 0 ? envelope.mark : cachedMark;
      if (mark <= 0) continue;
      const candleHigh = envelope.high > 0 ? envelope.high : mark;
      const candleLow = envelope.low > 0 ? envelope.low : mark;
      trade.execution = {
        source: trade.execution?.source ?? "paper-exchange",
        side: trade.execution?.side ?? (target >= intendedEntry ? "LONG" : "SHORT"),
        quantity: qty,
        orderIds: trade.execution?.orderIds ?? [],
        entryFillPrice: entryFill,
        exitFillPrice: trade.execution?.exitFillPrice,
        lastMarkPrice: mark,
        entryFeeUsd: trade.execution?.entryFeeUsd ?? 0,
        exitFeeUsd: trade.execution?.exitFeeUsd,
        entrySlippageUsd: trade.execution?.entrySlippageUsd ?? 0,
        exitSlippageUsd: trade.execution?.exitSlippageUsd,
        realizedPnlUsd: trade.execution?.realizedPnlUsd,
        realizedPnlPct: trade.execution?.realizedPnlPct,
      };

      const isLong =
        trade.execution?.side
          ? trade.execution.side === "LONG"
          : target >= intendedEntry;
      const hitStop = isLong ? (mark <= stop || candleLow <= stop) : (mark >= stop || candleHigh >= stop);
      const hitTarget = isLong ? (mark >= target) : (mark <= target);
      const entryTs = parseTimestamp(trade.entryTime);
      const timedOut = entryTs > 0 && scanMs - entryTs >= MAX_OPEN_TRADE_MS;
      const forceRiskOff = currentNotional > MAX_NOTIONAL_USD * 1.2;
      if (!hitStop && !hitTarget && !forceRiskOff && !timedOut) continue;

      const side = isLong ? "SELL" : "BUY";
      let order: Awaited<ReturnType<typeof placeMarketOrder>> | null = null;
      let fills: Awaited<ReturnType<typeof getOrderFills>> | null = null;
      let usedQty = qty;
      try {
        order = await placeMarketOrder({
          symbol: trade.symbol,
          side,
          quantity: qty,
          reduceOnly: true,
          clientOrderId: `trk-exit-${state.level}-${stableHash(`${trade.symbol}:${trade.entryTime}`)}`,
        });
        fills = await getOrderFills(trade.symbol, order.orderId);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown error";
        if (!isReduceOnlyRejected(reason)) throw error;
        const exchangeQty = await getPositionQuantity(trade.symbol).catch(() => 0);
        const absExchangeQty = Math.abs(exchangeQty);
        if (absExchangeQty <= 0.0000001) {
          fills = { avgPrice: mark, qty: 0, feeUsd: 0, timeMs: scanMs };
          usedQty = qty;
        } else {
          const fallbackSide = exchangeQty > 0 ? "SELL" : "BUY";
          const fallbackQty = await normalizeQuantity(trade.symbol, Math.min(absExchangeQty, qty));
          if (!Number.isFinite(fallbackQty) || fallbackQty <= 0) {
            throw error;
          }
          usedQty = fallbackQty;
          order = await placeMarketOrder({
            symbol: trade.symbol,
            side: fallbackSide,
            quantity: fallbackQty,
            clientOrderId: `trk-exit-fb-${state.level}-${stableHash(`${trade.symbol}:${trade.entryTime}:${scanMs}`)}`,
          });
          fills = await getOrderFills(trade.symbol, order.orderId);
        }
      }
      if (!fills) continue;
      const rawExitFill = fills.avgPrice;
      const exitFillDev = rawExitFill > 0 ? Math.abs(rawExitFill - mark) / Math.max(0.000001, mark) : 1;
      const exitPrice = rawExitFill > 0 && exitFillDev < 0.15 ? rawExitFill : mark;
      const exitFee = fills.feeUsd;
      const direction = isLong ? 1 : -1;
      const pnlExitPrice = hitStop ? stop : exitPrice;
      const gross = (pnlExitPrice - entryFill) * direction * usedQty;
      const entryFee = trade.execution?.entryFeeUsd ?? 0;
      const entrySlip = trade.execution?.entrySlippageUsd ?? 0;
      // Use fill-derived PnL with fees; synthetic intended-exit slippage can overstate losses.
      const netRaw = gross - entryFee - exitFee - entrySlip;
      const net = Math.max(-MAX_NOTIONAL_USD * 3, Math.min(MAX_NOTIONAL_USD * 3, netRaw));
      const notional = Math.max(0.000001, entryFill * usedQty);
      const netPct = (net / notional) * 100;

      let resolvedStatus: HistoryTrade["status"] = timedOut || forceRiskOff ? "Closed" : hitTarget ? "Win" : "Loss";
      let resolvedNote = timedOut
        ? "Forced time exit after 3 hours to prevent stale paper trades."
        : forceRiskOff
          ? "Forced risk-off close due to max notional breach."
          : hitTarget
            ? "Target hit on paper exchange fill."
            : "Stop hit on paper exchange fill.";
      if (!forceRiskOff && resolvedStatus === "Loss" && net > 0) {
        resolvedStatus = "Closed";
        resolvedNote = "Closed by reconciliation: positive realized PnL conflicted with stop classification.";
      }
      if (!forceRiskOff && resolvedStatus === "Win" && net <= 0) {
        resolvedStatus = "Closed";
        resolvedNote = "Closed by reconciliation: target condition met but net realized PnL was non-positive after costs/slippage.";
      }
      trade.status = resolvedStatus;
      trade.exitTime = formatTimestamp(fills.timeMs || scanMs);
      trade.note = resolvedNote;
      trade.execution = {
        ...trade.execution,
        source: "paper-exchange",
        side: isLong ? "LONG" : "SHORT",
        quantity: usedQty,
        orderIds: [...(trade.execution?.orderIds ?? []), ...(order ? [String(order.orderId)] : [])],
        entryFillPrice: entryFill,
        exitFillPrice: hitStop ? stop : exitPrice,
        lastMarkPrice: mark,
        entryFeeUsd: entryFee,
        exitFeeUsd: exitFee,
        entrySlippageUsd: entrySlip,
        exitSlippageUsd: 0,
        realizedPnlUsd: net,
        realizedPnlPct: netPct,
      };
      state.events.push({
        ts: fills.timeMs || scanMs,
        type: "EXIT",
        symbol: trade.symbol,
        orderId: order ? String(order.orderId) : `reconcile-${stableHash(`${trade.symbol}:${trade.entryTime}:${scanMs}`)}`,
        side: isLong ? "LONG" : "SHORT",
        quantity: usedQty,
        fillPrice: hitStop ? stop : exitPrice,
        feeUsd: exitFee,
      });
      appendTradeAudit("tracker", {
        level: state.level,
        timeframe: state.timeframe,
        eventType: "EXIT",
        symbol: trade.symbol,
        status: trade.status,
        entryTime: trade.entryTime,
        exitTime: trade.exitTime,
        orderId: order ? String(order.orderId) : `reconcile-${stableHash(`${trade.symbol}:${trade.entryTime}:${scanMs}`)}`,
        quantity: usedQty,
        entryFillPrice: entryFill,
        exitFillPrice: hitStop ? stop : exitPrice,
        realizedPnlUsd: net,
        realizedPnlPct: netPct,
        note: trade.note,
      }, fills.timeMs || scanMs);
      state.lastError = null;
      state.lastErrorAtMs = 0;
      state.cooldownUntilMs = scanMs + (15 * 60 * 1000);
      state.cooldownReason = "Post-trade 15m cooldown";
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      state.lastError = `Paper exit failed for ${trade.symbol}: ${reason}`;
      state.lastErrorAtMs = scanMs;
    }
  }
}

async function enforceOpenConcurrencyLimit(state: TrackerEngineState, nowMs: number) {
  const limit = maxConcurrentOpen(state.level);
  const openTrades = state.orders.filter((trade) => trade.status === "Open" && isPaperTrade(trade));
  if (openTrades.length <= limit) return;
  const sortedByOldest = [...openTrades].sort((a, b) => parseTimestamp(a.entryTime) - parseTimestamp(b.entryTime));
  const toClose = sortedByOldest.slice(0, openTrades.length - limit);
  const symbols = [...new Set(toClose.map((t) => t.symbol))];
  const marks = symbols.length > 0 ? await getMarkPrices(symbols).catch(() => new Map<string, number>()) : new Map<string, number>();

  for (const trade of toClose) {
    const entryFill = trade.execution?.entryFillPrice ?? parseEntryMid(trade.entry);
    const qty = trade.execution?.quantity ?? 0;
    if (entryFill <= 0 || qty <= 0) continue;
    const mark = marks.get(trade.symbol) ?? entryFill;
    const isLong = trade.execution?.side === "LONG";
    const direction = isLong ? 1 : -1;
    const gross = (mark - entryFill) * direction * qty;
    const entryFee = trade.execution?.entryFeeUsd ?? 0;
    const net = gross - entryFee;
    const notional = Math.max(0.000001, entryFill * qty);
    const pct = (net / notional) * 100;

    trade.status = "Closed";
    trade.exitTime = formatTimestamp(nowMs);
    trade.note = "Closed by concurrency reconciliation to enforce max concurrent open trades.";
    trade.execution = {
      ...trade.execution,
      source: "paper-exchange",
      side: isLong ? "LONG" : "SHORT",
      quantity: qty,
      orderIds: trade.execution?.orderIds ?? [],
      entryFillPrice: entryFill,
      exitFillPrice: mark,
      lastMarkPrice: mark,
      entryFeeUsd: entryFee,
      exitFeeUsd: 0,
      entrySlippageUsd: trade.execution?.entrySlippageUsd ?? 0,
      exitSlippageUsd: 0,
      realizedPnlUsd: net,
      realizedPnlPct: pct,
    };
    appendTradeAudit("tracker", {
      level: state.level,
      timeframe: state.timeframe,
      eventType: "RECONCILE_CLOSE",
      symbol: trade.symbol,
      status: trade.status,
      entryTime: trade.entryTime,
      exitTime: trade.exitTime,
      quantity: qty,
      entryFillPrice: entryFill,
      exitFillPrice: mark,
      realizedPnlUsd: net,
      realizedPnlPct: pct,
      note: trade.note,
    }, nowMs);
  }
}

async function placeNewOrders(state: TrackerEngineState, scanMs: number) {
  if (!(await isPaperExchangeConfiguredAsync())) return;
  clearTrackerCooldown(state, scanMs);

  const cap = hourlyOrderCap(state.level);
  recalculateGlobalOpenTrades();
  // Single source of truth: tradeStore — never state.orders — for capacity decisions.
  const engineId = difficultyToEngineId(state.level);
  const engineOpenTrades = tradeStore.openByEngine(engineId);
  const myOpen = engineOpenTrades.length;
  const openSlots = Math.max(0, maxConcurrentOpen(state.level) - myOpen);
  // Hourly cap: count currently OPEN trades opened this hour (not closed ones).
  // Using tradeStore ensures closed replacements don't block new entries.
  const currentHour = Math.floor(scanMs / (60 * 60_000));
  const openThisHour = engineOpenTrades.filter(
    (trade) => Math.floor(trade.openedAtMs / (60 * 60_000)) === currentHour,
  ).length;
  const remaining = Math.max(0, Math.min(cap - openThisHour, openSlots));
  if (remaining <= 0) return;

  // Block duplicate symbols portfolio-wide using tradeStore (single source of truth).
  const openSymbols = new Set(tradeStore.allOpen().map((trade) => trade.symbol));
  const candidates = state.signals
    .filter((signal) => !openSymbols.has(signal.symbol))
    .sort((a, b) => b.score - a.score);
  const candidateSymbols = [...new Set(candidates.map((signal) => signal.symbol))];
  const priceMap = candidateSymbols.length > 0 ? await getMarkPrices(candidateSymbols).catch(() => new Map<string, number>()) : new Map<string, number>();
  let noPriceCount = 0;
  let orderFailCount = 0;

  const additions: HistoryTrade[] = [];
  for (const signal of candidates) {
    if (additions.length >= remaining) break;
    try {
      let entryMid = parseEntryMid(signal.entry);
      let stop = parsePrice(signal.stop);
      let target = parsePrice(signal.target);
      let mark = priceMap.get(signal.symbol) ?? await getMarkPrice(signal.symbol).catch(() => 0);
      const usedSignalEntryAsMark = !Number.isFinite(mark) || mark <= 0;
      if (usedSignalEntryAsMark && entryMid > 0) {
        mark = entryMid;
      }
      if (!Number.isFinite(mark) || mark <= 0) {
        noPriceCount += 1;
        state.lastError = `Skipped ${signal.symbol}: no live mark price available.`;
        state.lastErrorAtMs = scanMs;
        continue;
      }
      // WS price confirmation: log if REST-only but do NOT hard-block in paper mode.
      // A REST price is accurate enough for paper simulation; we only skip if
      // we have NO price at all (handled above by the mark <= 0 check).
      const wsConfirmed = isWsConfirmedPrice(signal.symbol);
      const priceSource = wsConfirmed ? "ws" : "rest-fallback";

      const directionFromSignal = target >= entryMid ? 1 : -1;
      const mismatchRatio = entryMid > 0 ? Math.abs(mark - entryMid) / entryMid : 1;
      const rawRiskRatio = entryMid > 0 ? Math.abs(entryMid - stop) / entryMid : 0;
      const riskRatio = Math.max(0.003, Math.min(0.03, rawRiskRatio || 0.008));

      const symbolCheck = await explainSymbolEligibility(signal.symbol, 200_000);
      const tradableSymbol = symbolCheck.resolved;
      if (!symbolCheck.tradable || !tradableSymbol) {
        state.lastError = `Skipped ${signal.symbol}: ${symbolCheck.reason ?? "symbol not tradable on Binance USDT-M futures"}`;
        state.lastErrorAtMs = scanMs;
        continue;
      }
      if (!symbolCheck.liquid) {
        state.lastError = `Skipped ${signal.symbol}: ${symbolCheck.reason ?? "liquidity filter blocked low-volume pair"}`;
        state.lastErrorAtMs = scanMs;
        continue;
      }

      // If synthetic signal scale diverges from live market, normalize to live mark.
      if (!Number.isFinite(entryMid) || entryMid <= 0 || mismatchRatio > 0.03) {
        entryMid = mark;
        stop = directionFromSignal === 1 ? entryMid * (1 - riskRatio) : entryMid * (1 + riskRatio);
        const rrFromSignal =
          Math.abs(entryMid - stop) > 0
            ? Math.max(1.2, Math.min(5, Math.abs(target - parseEntryMid(signal.entry)) / Math.max(0.000001, Math.abs(parseEntryMid(signal.entry) - parsePrice(signal.stop)))))
            : 2.2;
        target = directionFromSignal === 1
          ? entryMid + Math.abs(entryMid - stop) * rrFromSignal
          : entryMid - Math.abs(entryMid - stop) * rrFromSignal;
      }

      const isLong = target >= entryMid;
      const riskPerUnit = Math.max(0.000001, Math.abs(entryMid - stop));
      const rr = Math.max(0.1, Math.abs(target - entryMid) / riskPerUnit);

      // ── Route through Portfolio Controller (canonical execution path) ──
      const candidate = buildCandidate({
        sourceEngine: difficultyToEngineId(state.level),
        strategyId: `${state.level}:${signal.setup}`,
        symbol: tradableSymbol,
        side: isLong ? "LONG" : "SHORT",
        setupType: signal.setup,
        timeframe: signal.timeframe,
        entryLow: isLong ? entryMid * 0.999 : entryMid * 0.999,
        entryHigh: isLong ? entryMid * 1.001 : entryMid * 1.001,
        entryMid,
        stopPlan: stop,
        targetPlan: target,
        confidence: Math.round(50 + (signal.score / 4)),
        netEdgeR: rr * 0.7,
        strategyScore: signal.score,
        reasonTags: [state.level, signal.setup, signal.timeframe],
      });

      const result = portfolioController.submit(candidate);
      if (!result.accepted) {
        state.lastError = `Portfolio rejected ${tradableSymbol}: [${result.stage}] ${result.reason} — ${result.detail}`;
        state.lastErrorAtMs = scanMs;
        continue;
      }

      const trade = result.trade;
      const fillPrice = trade.entryPrice;
      const entryTime = formatTimestamp(trade.openedAtMs);

      additions.push(tradeToHistoryTrade(trade));
      state.events.push({
        ts: trade.openedAtMs,
        type: "ENTRY",
        symbol: tradableSymbol,
        orderId: trade.id,
        side: isLong ? "LONG" : "SHORT",
        quantity: trade.quantity,
        fillPrice,
        feeUsd: trade.entryFeeUsd,
      });
      appendTradeAudit("tracker", {
        level: state.level,
        timeframe: state.timeframe,
        eventType: "ENTRY",
        symbol: tradableSymbol,
        strategy: signal.setup,
        entryTime,
        orderId: trade.id,
        side: isLong ? "LONG" : "SHORT",
        quantity: trade.quantity,
        entryFillPrice: fillPrice,
        entryZone: `${formatOrderPrice(entryMid * 0.999)} - ${formatOrderPrice(entryMid * 1.001)}`,
        stop: formatOrderPrice(trade.stopPrice),
        target: formatOrderPrice(trade.targetPrice),
      }, trade.openedAtMs);
      state.lastError = null;
      state.lastErrorAtMs = 0;
      state.cooldownUntilMs = scanMs + (15 * 60 * 1000);
      state.cooldownReason = "Post-trade 15m cooldown";
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      state.lastError = `Paper order failed for ${signal.symbol}: ${reason}`;
      state.lastErrorAtMs = scanMs;
      orderFailCount += 1;
      // Continue processing other candidates; one API error should not stop full cycle.
    }
  }

  if (additions.length > 0) {
    state.orders = mergeHistoryRows(state.orders || [], additions).slice(0, MAX_HISTORY);
    recalculateGlobalOpenTrades();
    state.lastOrderMs = scanMs;
    state.lastError = null;
    state.lastErrorAtMs = 0;
      state.cooldownUntilMs = scanMs + (15 * 60 * 1000);
      state.cooldownReason = "Post-trade 15m cooldown";
    return;
  }
  if (candidates.length > 0 && noPriceCount === candidates.length) {
    state.lastError = "No live market prices available for current candidates (data source throttled || unavailable).";
    state.lastErrorAtMs = scanMs;
    setTrackerCooldown(state, scanMs + Math.min(45_000, Math.max(10_000, Math.floor(scanIntervalFor(state.level) / 2))), state.lastError);
  } else if (candidates.length > 0 && orderFailCount > 0 && orderFailCount === candidates.length) {
    if (!state.lastError) {
      state.lastError = "All candidate orders failed this cycle.";
      state.lastErrorAtMs = scanMs;
    }
  }
}

async function advanceState(state: TrackerEngineState, now: number) {
  if (state.processing) return;
  if (state.cooldownUntilMs > now && state.cooldownReason && state.nextScanDueMs > now) return;
  state.processing = true;
  try {
    clearTrackerCooldown(state, now);
    state.orders = state.orders || [];
    // Sync: close any trades that the portfolioController monitor closed externally.
    // This is critical for slot freeing — without it the tracker never opens replacements.
    syncOrdersWithTradeStore(state, now);
    // Invariant: detect state desync — state.orders says open but tradeStore is empty.
    {
      const stateOpenCount = state.orders.filter(
        (t) => t.status === "Open" && t.execution?.orderIds?.[0]?.startsWith?.("trd-"),
      ).length;
      if (stateOpenCount > 0 && tradeStore.allOpen().length === 0) {
        console.error(
          `[TrackerEngine:${state.level}] STATE_DESYNC_DETECTED: ` +
          `state.orders has ${stateOpenCount} open portfolio trade(s) but tradeStore has 0 — ` +
          `syncOrdersWithTradeStore should have resolved this`,
        );
      }
    }
    const intervalMs = scanIntervalFor(state.level);
    let guard = 0;
    while (now - state.lastScanMs >= intervalMs && guard < 256) {
      guard += 1;
      state.lastScanMs += intervalMs;
      state.nextScanDueMs = state.lastScanMs + intervalMs;
      const cycleSeed = Math.floor(state.lastScanMs / intervalMs);
      const liveUniverse = getActiveUniverse(state.level, STATIC_SYMBOLS);
      const activeUniverse = liveUniverse.length > 0
        ? liveUniverse
        : (state.signals.length > 0
            ? [...new Set(state.signals.map((signal) => signal.symbol))]
            : STATIC_SYMBOLS);
      state.signals = state.level === "expert"
        ? await buildTrendBreakoutSignals(state.timeframe, activeUniverse)
        : buildSignalsForUniverse(state.level, state.timeframe, activeUniverse, cycleSeed);
      state.universePairs = activeUniverse.length > 0 ? activeUniverse.length : (state.level === "expert" ? getTrendBreakoutUniverseCount() : STATIC_SYMBOLS.length);
      state.trackedPairs = state.universePairs;
      const cycleSymbols = [
        ...new Set([
          ...state.signals.map((signal) => signal.symbol),
          ...state.orders.filter((trade) => trade.status === "Open" && isPaperTrade(trade)).map((trade) => trade.symbol),
        ]),
      ];
      const cyclePriceMap = cycleSymbols.length > 0 ? await getMarkPrices(cycleSymbols).catch(() => new Map<string, number>()) : new Map<string, number>();
      await maybeCloseOpenTrades(state, state.lastScanMs, cyclePriceMap);
      await enforceOpenConcurrencyLimit(state, state.lastScanMs);
      await placeNewOrders(state, state.lastScanMs);
      enforceHourlyCaps(state);
      state.orders = state.orders || [];
    }
    // Always run a close/risk pass even between scan boundaries so oversized legacy
    // positions and stop/target hits are not delayed by timeframe cadence.
    const openSymbols = [
      ...new Set(state.orders.filter((trade) => trade.status === "Open" && isPaperTrade(trade)).map((trade) => trade.symbol)),
    ];
    const openPriceMap = openSymbols.length > 0 ? await getMarkPrices(openSymbols).catch(() => new Map<string, number>()) : new Map<string, number>();
    await maybeCloseOpenTrades(state, now, openPriceMap);
    await enforceOpenConcurrencyLimit(state, now);
    if (state.level === "ace") {
      // Ace must keep trying to fill top-3 opportunities without waiting for the next 15m boundary.
      if (state.cooldownUntilMs > now) return;
      await placeNewOrders(state, now);
      enforceHourlyCaps(state);
    }
    if (state.lastOrderMs === 0 && await isPaperExchangeConfiguredAsync()) {
      if (state.signals.length === 0) {
        const cycleSeed = Math.floor(now / intervalMs);
        const liveUniverse = getActiveUniverse(state.level, STATIC_SYMBOLS);
        const refillUniverse = liveUniverse.length > 0 ? liveUniverse : STATIC_SYMBOLS;
        state.signals = state.level === "expert"
          ? await buildTrendBreakoutSignals(state.timeframe, refillUniverse)
          : buildSignalsForUniverse(state.level, state.timeframe, refillUniverse, cycleSeed);
        state.universePairs = refillUniverse.length > 0 ? refillUniverse.length : Math.max(state.universePairs ?? 0, state.signals.length, state.orders.length);
        state.trackedPairs = state.universePairs;
      }
      await placeNewOrders(state, now);
      enforceHourlyCaps(state);
    }
    enforceHourlyCaps(state);
    state.orders = state.orders || [];
    state.events = state.events.slice(-4000);
    recalculateGlobalOpenTrades();
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown tracker engine error";
    state.lastError = reason;
    state.lastErrorAtMs = now;
    if (reason.toLowerCase().includes("cooldown") || reason.includes("418") || reason.includes("429")) {
      const untilMs = Math.max(getPublicBanUntilMs(), now + 8_000);
      setTrackerCooldown(state, untilMs, reason);
      state.nextScanDueMs = Math.min(untilMs, now + 15_000);
    } else {
      state.nextScanDueMs = now + Math.min(60_000, Math.max(5_000, Math.floor(scanIntervalFor(state.level) / 2)));
    }
  } finally {
    state.processing = false;
  }
}

async function advanceAll(now = Date.now()) {
  await Promise.all([...engineState.values()].map((state) => advanceState(state, now)));
  persistState(now);
}

function scheduleTrackerState(state: TrackerEngineState) {
  const key = keyFor(state.level, state.timeframe);
  if (trackerTimers.has(key)) return;
  const intervalMs = scanIntervalFor(state.level);
  const offsetMs = trackerOrder.indexOf(state.level) * TRACKER_STAGGER_MS;
  const tick = () => {
    const now = Date.now();
    void advanceState(state, now).finally(() => persistState(now));
  };
  const bootstrap = setTimeout(() => {
    tick();
    const timer = setInterval(tick, intervalMs);
    trackerTimers.set(key, timer);
  }, offsetMs);
  trackerTimers.set(key, bootstrap);
}

export function startTrackerEngine() {
  if (engineStarted) return;
  // NOTE: engineStarted is intentionally set AFTER successful initialization so
  // that a crash during startup (e.g. malformed runtime state files) does not
  // permanently prevent timers from being created on the next invocation.
  try {
    // portfolioController.start() hard-resets tradeStore and calls
    // recalculateStateFromOpenTrades + rebuildFromOpenTrades internally.
    portfolioController.start();
    // Load display history — any "Open" trades are converted to "Closed" in loadPersistedState.
    loadPersistedState();
    // Re-sync portfolio state and registry after persisted history is loaded,
    // ensuring tradeStore remains the sole source of truth for capacity.
    recalculateStateFromOpenTrades();
    rebuildFromOpenTrades(tradeStore.allOpen());
    const now = Date.now();
    for (const timeframe of DEFAULT_TIMEFRAMES) {
      for (const level of trackerOrder) {
        const state = ensureState(level, timeframe, now);
        scheduleTrackerState(state);
      }
    }
    void advanceAll(now);
    // Mark started only after timers are set up successfully.
    engineStarted = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[TrackerEngine] Startup failed — will retry on next request: ${msg}`);
    // Leave engineStarted = false so the next API call retries initialization.
  }
}

export async function getTrackerSnapshot(level: Difficulty, timeframe: string): Promise<TrackerEngineSnapshot> {
  startTrackerEngine();
  const state = ensureState(level, timeframe, Date.now());
  // Do NOT await advanceState here — the background timer advances on schedule.
  // Calling it on every request caused 30–120 s blocking per page load.
  state.orders = state.orders || [];
  const now = Date.now();
  const gapLimitMs = level === "ace" ? 2 * 60 * 60_000 : 75 * 60_000;
  const cooldownActive = state.cooldownUntilMs > now;
  const recentScanHealthy = state.lastScanMs > 0 && now - state.lastScanMs <= Math.max(gapLimitMs, BASE_SCAN_INTERVAL_MS * 8);
  const trackerHealthy = (state.lastOrderMs > 0 && now - state.lastOrderMs <= gapLimitMs) || recentScanHealthy || cooldownActive;
  return {
    level,
    timeframe,
    signals: state.signals,
    history: state.orders,
    startedAtMs: state.startedAtMs,
    lastScanMs: state.lastScanMs,
    lastOrderMs: state.lastOrderMs,
    trackerHealthy,
    orderCapPerHour: hourlyOrderCap(level),
    paperExecutionConfigured: await isPaperExchangeConfiguredAsync(),
    lastError: state.lastError,
    lastErrorAtMs: state.lastErrorAtMs,
    cooldownUntilMs: state.cooldownUntilMs,
    cooldownReason: state.cooldownReason,
    nextScanDueMs: state.nextScanDueMs,
    trackedPairs: Math.max(state.trackedPairs ?? 0, state.universePairs ?? 0, state.signals.length, state.orders.filter((trade) => trade.status === "Open").length),
    universePairs: state.universePairs ?? (level === "expert" ? getTrendBreakoutUniverseCount() : STATIC_SYMBOLS.length),
    openPairs: tradeStore.allOpen().length,
  };
}
