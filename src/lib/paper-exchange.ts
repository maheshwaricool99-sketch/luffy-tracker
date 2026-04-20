/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  PAPER EXCHANGE — PAPER TRADING ONLY                                ║
 * ║  Live order submission is permanently disabled.                     ║
 * ║  All trades are simulated. No real funds are at risk.               ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * All price data flows through price-engine.ts (multi-exchange WS feeds).
 * No Binance API keys. No signed requests. No live order routing.
 */

import { blockLiveExecution } from "./paper-mode";
import { getLivePrice, getLivePrices, createPriceSnapshot, isWsConfirmedPrice, getPriceSync, getUnifiedPrice, getUnifiedPrices, getLatestPriceMetadata } from "./price-engine";

/**
 * Hard-blocked stub for any code path that attempts live order submission.
 * This function can never succeed — it always throws.
 * @throws {Error} LIVE_TRADING_DISABLED
 */
export function submitLiveOrder(..._args: unknown[]): never {
  return blockLiveExecution("submitLiveOrder");
}

/**
 * @alias submitLiveOrder — hard-blocked
 * @throws {Error} LIVE_TRADING_DISABLED
 */
export function placeLiveFuturesOrder(..._args: unknown[]): never {
  return blockLiveExecution("placeLiveFuturesOrder");
}

/**
 * @alias submitLiveOrder — hard-blocked
 * @throws {Error} LIVE_TRADING_DISABLED
 */
export function createSignedExchangeOrder(..._args: unknown[]): never {
  return blockLiveExecution("createSignedExchangeOrder");
}

export type { PriceData } from "./price-engine";
export { getLivePrice, getLivePrices, createPriceSnapshot, isWsConfirmedPrice, getPriceSync, getUnifiedPrice, getUnifiedPrices, getLatestPriceMetadata } from "./price-engine";

export type KlineCandle = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
};

export type SymbolEligibility = {
  requested: string;
  normalized: string;
  resolved: string | null;
  tradable: boolean;
  liquid: boolean;
  quoteVolume: number;
  reason: string | null;
};

function asSymbol(input: unknown): string {
  return String(input ?? "").trim().toUpperCase();
}

// ── Price helpers (delegated to price-engine) ─────────────────────────────────

export async function getMarkPrice(symbol: string): Promise<number> {
  return (await getLivePrice(symbol)).price;
}

export async function getMarkPrices(symbols: string[] = []): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (symbols.length === 0) return out;
  const data = await getLivePrices(symbols);
  for (const [sym, pd] of data) out.set(sym, pd.price);
  return out;
}

export async function getRecentPriceEnvelope(
  symbol: string,
  ..._args: unknown[]
): Promise<{ mark: number; high: number; low: number }> {
  const price = (await getLivePrice(symbol)).price;
  return { mark: price, high: price, low: price };
}

export async function getCandles(
  symbol: string,
  _interval: string = "15m",
  limit: number = 100,
  ..._args: unknown[]
): Promise<KlineCandle[]> {
  const price = (await getLivePrice(symbol)).price;
  const now = Date.now();
  const count = Math.max(0, Math.min(Number(limit) || 0, 1000));
  return Array.from({ length: count }, (_, i) => ({
    openTime: now - (count - i) * 60_000,
    open: price,
    high: price,
    low: price,
    close: price,
    volume: 0,
    closeTime: now - (count - i - 1) * 60_000,
  }));
}

export async function getOrderFills(
  symbol?: string,
  _orderId?: number | string,
  ..._args: unknown[]
): Promise<{ avgPrice: number; qty: number; feeUsd: number; timeMs: number }> {
  const s = asSymbol(symbol ?? "");
  const price = s ? (await getLivePrice(s)).price : 0;
  return { avgPrice: price, qty: 0, feeUsd: 0, timeMs: Date.now() };
}

// ── Order sizing ──────────────────────────────────────────────────────────────

export async function getPositionQuantity(..._args: unknown[]): Promise<number> {
  return 0;
}

export async function normalizeQuantity(
  _symbol?: string,
  quantity?: number,
  ..._args: unknown[]
): Promise<number> {
  const q = Number(quantity ?? 0);
  return Number.isFinite(q) && q > 0 ? q : 0;
}

/**
 * Compute paper-trading order quantity.
 * Accepts an object `{ referencePrice, marginUsd, leverage, maxNotionalUsd }`
 * or a legacy plain-number (returned as-is if positive).
 */
export async function computeFuturesOrderQuantity(
  params:
    | {
        symbol?: string;
        referencePrice?: number;
        marginUsd?: number;
        leverage?: number;
        maxNotionalUsd?: number;
      }
    | number
    | undefined,
  ..._rest: unknown[]
): Promise<number> {
  if (typeof params === "number") {
    return Number.isFinite(params) && params > 0 ? params : 0;
  }
  const p = params && typeof params === "object" ? params : {};
  const referencePrice = Number(p.referencePrice ?? 0);
  if (!Number.isFinite(referencePrice) || referencePrice <= 0) return 0;
  const marginUsd = Number(p.marginUsd ?? process.env.PAPER_MARGIN_PER_TRADE_USD ?? 20);
  const leverage = Number(p.leverage ?? process.env.PAPER_LEVERAGE ?? 5);
  const maxNotionalUsd = Number(p.maxNotionalUsd ?? process.env.PAPER_MAX_NOTIONAL_USD ?? 100);
  const safeMargin = Number.isFinite(marginUsd) && marginUsd > 0 ? marginUsd : 20;
  const safeLeverage = Number.isFinite(leverage) && leverage > 0 ? leverage : 5;
  const safeMax = Number.isFinite(maxNotionalUsd) && maxNotionalUsd > 0 ? maxNotionalUsd : 100;
  const notional = Math.max(0, Math.min(safeMargin * safeLeverage, safeMax));
  const qty = notional / referencePrice;
  return Number.isFinite(qty) && qty > 0 ? qty : 0;
}

// ── Order placement ───────────────────────────────────────────────────────────

export async function placeMarketOrder(
  params: {
    symbol?: string;
    side?: "BUY" | "SELL";
    quantity?: number;
    reduceOnly?: boolean;
    clientOrderId?: string;
  } = {},
  ..._args: unknown[]
): Promise<{ orderId: number; updateTime: number; avgPrice: string }> {
  const symbol = asSymbol(params?.symbol);
  const price = symbol ? (await getLivePrice(symbol)).price : 0;
  return {
    orderId: Date.now() + Math.floor(Math.random() * 1_000_000),
    updateTime: Date.now(),
    avgPrice: String(price || 0),
  };
}

export const submitPaperOrder = placeMarketOrder;

// ── Symbol helpers ────────────────────────────────────────────────────────────

export function resolveTradableSymbol(symbol: string, ..._args: unknown[]): string {
  return asSymbol(symbol);
}

export function filterTradableLiquidSymbols(symbols: string[] = [], ..._args: unknown[]): string[] {
  return symbols.filter(Boolean).map(asSymbol);
}

export async function explainSymbolEligibility(
  symbol: string,
  minQuoteVolume: number = 0,
  ..._args: unknown[]
): Promise<SymbolEligibility> {
  const normalized = asSymbol(symbol);
  return {
    requested: symbol,
    normalized,
    resolved: normalized || null,
    tradable: Boolean(normalized),
    liquid: true,
    quoteVolume: Number(minQuoteVolume) || 0,
    reason: normalized ? null : "invalid symbol",
  };
}

export async function getTradableUsdtPerpetualSymbols(
  _minQuoteVolume: number = 0,
  ..._args: unknown[]
): Promise<string[]> {
  return [];
}

// ── Exchange status ───────────────────────────────────────────────────────────

export async function getPaperExchangeAvailability(
  ..._args: unknown[]
): Promise<{ configured: boolean; reason: string }> {
  return { configured: true, reason: "" };
}

export async function isPaperExchangeConfiguredAsync(..._args: unknown[]): Promise<boolean> {
  return true;
}

export async function getAvailableFuturesMarginUsd(..._args: unknown[]): Promise<number> {
  return 1000;
}

export function isGlobalMarginCoolingDown(..._args: unknown[]): boolean {
  return false;
}

export function getPublicBanUntilMs(..._args: unknown[]): number {
  return 0;
}

export async function getPaperConnectionStatus(
  ..._args: unknown[]
): Promise<{ ok: boolean; state: string; message: string; executionMode: string; liveTradingEnabled: boolean }> {
  return {
    ok: true,
    state: "paper-only",
    message: "PAPER MODE ONLY — live trading permanently disabled",
    executionMode: "paper",
    liveTradingEnabled: false,
  };
}
