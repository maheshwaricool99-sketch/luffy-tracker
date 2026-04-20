/**
 * PORTFOLIO STATE — SINGLE SOURCE OF TRUTH
 *
 * Authoritative registry for:
 *   • All open trades across every engine
 *   • Per-engine exposure (hard $500 cap)
 *   • Global exposure (hard 50% of balance cap)
 *   • Duplicate-symbol locks (portfolio-wide)
 *
 * This module is the ONLY place that knows about capital usage.
 * No engine may maintain its own exposure counter.
 *
 * Integration flow:
 *   execution-service.open()  → registerOpenTrade()
 *   execution-service.close() → closeOpenTrade()
 *   app startup               → recalculateStateFromOpenTrades()
 */

import fs from "node:fs";
import path from "node:path";
import type { EngineId } from "./trading/types";

// ── Constants ─────────────────────────────────────────────────────────────────

export const ENGINE_CAP_USD            = 500;     // hard per-engine total capital
export const MAX_OPEN_PER_ENGINE       = 5;       // max simultaneous trades per engine
export const MAX_NOTIONAL_PER_TRADE_USD = Math.floor(ENGINE_CAP_USD / MAX_OPEN_PER_ENGINE); // $100
export const MAX_GLOBAL_EXPOSURE_PCT   = 0.50;   // 50% of balance
export const TOTAL_BALANCE_USD         = 10_000;  // paper account size
export const MIN_TRADE_SIZE_USD        = 5;       // minimum meaningful trade

const PERSIST_PATH = path.join(process.cwd(), ".runtime", "portfolio-state.json");

// ── Types ─────────────────────────────────────────────────────────────────────

export type EngineName =
  | "luffy"
  | "luffy-lite"
  | "tracker-advanced"
  | "tracker-expert"
  | "tracker-ace";

export type OpenTrade = {
  id: string;
  symbol: string;
  engine: EngineName;
  sizeUsd: number;      // notional USD (quantity × entryPrice)
  qty: number;
  entryPrice: number;
  side: "LONG" | "SHORT";
  openedAt: number;
};

export type ValidateResult =
  | { ok: true; allowedSizeUsd: number }
  | { ok: false; reason: RejectionReason; details: Record<string, unknown> };

export type RejectionReason =
  | "DUPLICATE_SYMBOL"
  | "INVALID_SIZE"
  | "ENGINE_CAP_EXCEEDED"
  | "GLOBAL_EXPOSURE_CAP"
  | "GLOBAL_BALANCE_INVALID";

export type EngineCapSummary = {
  engine: EngineName;
  engineUsedUsd: number;
  engineCapUsd: number;
  engineRemainingUsd: number;
  openTradeCount: number;
};

export type RiskDiagnostics = {
  globalUsedUsd: number;
  globalCapUsd: number;
  globalExposurePct: number;
  totalOpenTrades: number;
  engines: EngineCapSummary[];
};

// ── EngineId → EngineName mapping ─────────────────────────────────────────────

export function engineIdToName(id: EngineId): EngineName {
  if (id === "luffy")      return "luffy";
  if (id === "luffy-lite") return "luffy-lite";
  if (id === "advanced")   return "tracker-advanced";
  if (id === "expert")     return "tracker-expert";
  return "tracker-ace";   // ace
}

const ALL_ENGINE_NAMES: EngineName[] = [
  "luffy", "luffy-lite", "tracker-advanced", "tracker-expert", "tracker-ace",
];

// ── In-memory state ───────────────────────────────────────────────────────────

const _trades = new Map<string, OpenTrade>();
let _booted = false;

// ── Persistence ───────────────────────────────────────────────────────────────

function persistState(): void {
  try {
    const dir = path.dirname(PERSIST_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${PERSIST_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify([..._trades.values()]), "utf8");
    fs.renameSync(tmp, PERSIST_PATH);
  } catch { /* never crash */ }
}

function loadFromDisk(): void {
  try {
    if (fs.existsSync(PERSIST_PATH)) {
      const arr = JSON.parse(fs.readFileSync(PERSIST_PATH, "utf8")) as OpenTrade[];
      for (const t of arr) _trades.set(t.id, t);
    }
  } catch { /* start fresh */ }
}

// ── Boot / reconciliation ─────────────────────────────────────────────────────

/**
 * Rebuild in-memory state from the live trade-store.
 * Call on startup and after any reconciliation event.
 * Imported lazily to avoid circular dependency at module load time.
 *
 * Validation: only trades with entryPrice > 0, qty > 0, notionalUsd > 0,
 * and status === "open" are counted. Invalid/stale trades are skipped so
 * they cannot silently consume capacity.
 */
export function recalculateStateFromOpenTrades(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { tradeStore } = require("./trading/trade-store") as { tradeStore: import("./trading/trade-store").TradeStorePublic };
  _trades.clear();
  const live = tradeStore.allOpen();
  let skipped = 0;
  for (const t of live) {
    const valid =
      t.status === "open" &&
      t.entryPrice > 0 &&
      t.quantity  > 0 &&
      t.notionalUsd > 0 &&
      Number.isFinite(t.entryPrice) &&
      Number.isFinite(t.quantity)  &&
      Number.isFinite(t.notionalUsd);

    if (!valid) {
      skipped++;
      console.warn(
        `[PortfolioState] Skipping invalid trade ${t.id} ` +
        `(entry=${t.entryPrice} qty=${t.quantity} notional=$${t.notionalUsd} status=${t.status})`,
      );
      continue;
    }

    _trades.set(t.id, {
      id:         t.id,
      symbol:     t.symbol,
      engine:     engineIdToName(t.sourceEngine),
      sizeUsd:    t.notionalUsd,
      qty:        t.quantity,
      entryPrice: t.entryPrice,
      side:       t.side,
      openedAt:   t.openedAtMs,
    });
  }
  persistState();
  _booted = true;
  const usedStr = getGlobalUsedUsd().toFixed(2);
  console.log(
    `[PortfolioState] Rebuilt: ${_trades.size} valid open trades` +
    (skipped ? `, ${skipped} invalid skipped` : "") +
    `, global used $${usedStr}`,
  );
  // Per-engine summary
  for (const eng of ALL_ENGINE_NAMES) {
    const used = getEngineUsedUsd(eng);
    const rem  = Math.max(0, ENGINE_CAP_USD - used);
    if (used > 0) {
      console.log(`[PortfolioState]   ${eng}: used=$${used.toFixed(2)} remaining=$${rem.toFixed(2)}`);
    }
  }
}

function boot(): void {
  if (_booted) return;
  loadFromDisk();
  recalculateStateFromOpenTrades();
}

// ── Read API ──────────────────────────────────────────────────────────────────

export function getAllOpenTrades(): OpenTrade[] {
  boot();
  return [..._trades.values()];
}

export function getGlobalUsedUsd(): number {
  boot();
  let sum = 0;
  for (const t of _trades.values()) sum += t.sizeUsd;
  return sum;
}

export function getGlobalExposurePercent(): number {
  return (getGlobalUsedUsd() / TOTAL_BALANCE_USD) * 100;
}

export function getEngineUsedUsd(engine: EngineName): number {
  boot();
  let sum = 0;
  for (const t of _trades.values()) if (t.engine === engine) sum += t.sizeUsd;
  return sum;
}

export function getEngineOpenTrades(engine: EngineName): OpenTrade[] {
  boot();
  return [..._trades.values()].filter(t => t.engine === engine);
}

export function isSymbolAlreadyOpen(symbol: string): boolean {
  boot();
  const s = symbol.toUpperCase();
  for (const t of _trades.values()) if (t.symbol.toUpperCase() === s) return true;
  return false;
}

export function findOpenTradeBySymbol(symbol: string): OpenTrade | null {
  boot();
  const s = symbol.toUpperCase();
  for (const t of _trades.values()) if (t.symbol.toUpperCase() === s) return t;
  return null;
}

// ── Canonical engine capacity function ───────────────────────────────────────

export type EngineCapacity = {
  maxCapital:          number;  // ENGINE_CAP_USD = 500
  usedCapital:         number;  // sum of valid open trade notionals
  remainingCapacity:   number;  // max(0, maxCapital - usedCapital)
  validOpenTradesCount: number; // trades actually counted
  openTradeCount:      number;  // total trades in map (before validation)
  paperMode:           true;
  statusLabel:         "PAPER";
};

/**
 * Single source of truth for engine capacity.
 *
 * Computes ONLY from currently valid open trades for this engine:
 *   - status must be "open"
 *   - entryPrice > 0 and finite
 *   - qty > 0 and finite
 *
 * Does NOT use: balanceUsd, equity, pnl, reservedCapital, exposureUsd,
 * runtime snapshots, closed trades, rejected orders, or pending signals.
 *
 * Auto-heals: if validOpenTradesCount === 0 but remaining === 0,
 * the state is corrupt — force-reset usedCapital to 0 and log it.
 */
export function computeEngineCapacity(engine: EngineName): EngineCapacity {
  boot();
  const allTrades = [..._trades.values()].filter(t => t.engine === engine);

  const validTrades = allTrades.filter(t =>
    Number.isFinite(t.entryPrice) && t.entryPrice > 0 &&
    Number.isFinite(t.qty)        && t.qty > 0 &&
    Number.isFinite(t.sizeUsd)    && t.sizeUsd > 0,
  );

  const usedCapital = validTrades.reduce((sum, t) => sum + Math.max(0, t.sizeUsd), 0);
  const clampedUsed = Math.max(0, usedCapital);
  let remaining     = Math.max(0, ENGINE_CAP_USD - clampedUsed);

  // AUTO-HEAL: if there are NO valid open trades but capacity shows 0, the
  // state is corrupt (ghost entries). Reset to full capacity and log.
  if (validTrades.length === 0 && remaining === 0) {
    console.warn(
      `[cap.autoheal] engine=${engine} ` +
      `reason=no-open-trades-but-zero-capacity | ` +
      `allTrades=${allTrades.length} — resetting to $${ENGINE_CAP_USD}`,
    );
    // Purge ghost entries for this engine from the map
    for (const t of allTrades) _trades.delete(t.id);
    persistState();
    remaining = ENGINE_CAP_USD;
  }

  return {
    maxCapital:          ENGINE_CAP_USD,
    usedCapital:         Math.round(clampedUsed  * 100) / 100,
    remainingCapacity:   Math.round(remaining     * 100) / 100,
    validOpenTradesCount: validTrades.length,
    openTradeCount:      allTrades.length,
    paperMode:           true,
    statusLabel:         "PAPER",
  };
}

/**
 * How much USD can this engine still open (min of engine cap room and global cap room).
 * Uses computeEngineCapacity() as the single source of truth for the engine portion.
 * Returns 0 if the engine or global cap is full.
 */
export function computeAllowedSizeUsd(engine: EngineName): number {
  const cap = computeEngineCapacity(engine);
  const engineRemaining = cap.remainingCapacity;

  const globalUsed      = getGlobalUsedUsd();
  const globalAllowed   = TOTAL_BALANCE_USD * MAX_GLOBAL_EXPOSURE_PCT;
  const globalRemaining = Math.max(0, globalAllowed - globalUsed);

  return Math.min(engineRemaining, globalRemaining);
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateTradeRequest(params: {
  engine: EngineName;
  symbol: string;
  proposedSizeUsd: number;
}): ValidateResult {
  const { engine, symbol, proposedSizeUsd } = params;
  boot();

  if (TOTAL_BALANCE_USD <= 0) {
    return { ok: false, reason: "GLOBAL_BALANCE_INVALID", details: { totalBalanceUsd: TOTAL_BALANCE_USD } };
  }

  if (!isFinite(proposedSizeUsd) || proposedSizeUsd <= 0) {
    return { ok: false, reason: "INVALID_SIZE", details: { proposedSizeUsd } };
  }

  // Portfolio-wide duplicate symbol lock
  const existingTrade = findOpenTradeBySymbol(symbol);
  if (existingTrade) {
    return {
      ok: false, reason: "DUPLICATE_SYMBOL",
      details: { symbol, existingEngine: existingTrade.engine, existingTradeId: existingTrade.id },
    };
  }

  // Per-engine hard cap
  const engineUsedUsd     = getEngineUsedUsd(engine);
  const engineRemainingUsd = Math.max(0, ENGINE_CAP_USD - engineUsedUsd);
  if (proposedSizeUsd > engineRemainingUsd || engineRemainingUsd < MIN_TRADE_SIZE_USD) {
    return {
      ok: false, reason: "ENGINE_CAP_EXCEEDED",
      details: { engine, engineUsedUsd, proposedSizeUsd, engineCapUsd: ENGINE_CAP_USD, engineRemainingUsd },
    };
  }

  // Global exposure cap
  const globalUsedUsd    = getGlobalUsedUsd();
  const globalAllowedUsd = TOTAL_BALANCE_USD * MAX_GLOBAL_EXPOSURE_PCT;
  const globalRemainingUsd = Math.max(0, globalAllowedUsd - globalUsedUsd);
  if (proposedSizeUsd > globalRemainingUsd) {
    return {
      ok: false, reason: "GLOBAL_EXPOSURE_CAP",
      details: {
        globalUsedUsd, globalAllowedUsd, proposedSizeUsd,
        globalExposurePctAfter: ((globalUsedUsd + proposedSizeUsd) / TOTAL_BALANCE_USD) * 100,
      },
    };
  }

  return { ok: true, allowedSizeUsd: Math.min(engineRemainingUsd, globalRemainingUsd) };
}

// ── Write API ─────────────────────────────────────────────────────────────────

export function registerOpenTrade(trade: OpenTrade): void {
  boot();
  _trades.set(trade.id, trade);
  persistState();
}

export function closeOpenTrade(tradeId: string): void {
  boot();
  if (_trades.has(tradeId)) {
    _trades.delete(tradeId);
    persistState();
  }
}

// ── Diagnostics ───────────────────────────────────────────────────────────────

export function getPortfolioRiskDiagnostics(): RiskDiagnostics {
  boot();
  const globalUsedUsd  = getGlobalUsedUsd();
  const globalCapUsd   = TOTAL_BALANCE_USD * MAX_GLOBAL_EXPOSURE_PCT;
  const globalExposurePct = (globalUsedUsd / TOTAL_BALANCE_USD) * 100;
  const totalOpenTrades = _trades.size;

  const engines: EngineCapSummary[] = ALL_ENGINE_NAMES.map(engine => {
    const engineUsedUsd    = getEngineUsedUsd(engine);
    const engineRemainingUsd = Math.max(0, ENGINE_CAP_USD - engineUsedUsd);
    return {
      engine,
      engineUsedUsd:     Math.round(engineUsedUsd * 100) / 100,
      engineCapUsd:      ENGINE_CAP_USD,
      engineRemainingUsd: Math.round(engineRemainingUsd * 100) / 100,
      openTradeCount:    getEngineOpenTrades(engine).length,
    };
  });

  return {
    globalUsedUsd:    Math.round(globalUsedUsd * 100) / 100,
    globalCapUsd:     Math.round(globalCapUsd * 100) / 100,
    globalExposurePct: Math.round(globalExposurePct * 100) / 100,
    totalOpenTrades,
    engines,
  };
}

export function logEngineCycleDiagnostics(engine: EngineName): void {
  const engineUsedUsd     = getEngineUsedUsd(engine);
  const engineRemainingUsd = Math.max(0, ENGINE_CAP_USD - engineUsedUsd);
  const globalUsedUsd     = getGlobalUsedUsd();
  const globalExposurePct = (globalUsedUsd / TOTAL_BALANCE_USD) * 100;
  console.log(`[PortfolioState:${engine}] used=$${engineUsedUsd.toFixed(2)}/${ENGINE_CAP_USD} remaining=$${engineRemainingUsd.toFixed(2)} | global=$${globalUsedUsd.toFixed(2)} (${globalExposurePct.toFixed(1)}%) | openTrades=${_trades.size}`);
}
