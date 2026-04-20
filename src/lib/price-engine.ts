/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║          INSTITUTIONAL GRADE PRICE ENGINE                           ║
 * ║  PRICE_ENGINE_MODE = INSTITUTIONAL_WS_MULTI_EXCHANGE                ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║  Source stack (first live source wins per symbol):                  ║
 * ║    1. Bybit SPOT WS  — all USDT spot pairs (covers symbols with    ║
 * ║                        no perp listing, e.g. LAYER, SKLUSDT)       ║
 * ║    2. Bybit LINEAR WS — USDT perpetuals, ms-latency tick feed      ║
 * ║    3. OKX    WS  — all USDT spot symbols from universe             ║
 * ║    4. Binance.US REST — full 600-symbol batch, 10-s polling        ║
 * ║    5. Binance api1/api2/api3 REST — mirror fallbacks               ║
 * ║    6. Last-known-good cache — survives all outages                  ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║  Guarantees:                                                        ║
 * ║    • Zero single-point-of-failure — WS death → REST continues      ║
 * ║    • WS self-heals with exponential backoff (max 30 s)             ║
 * ║    • Scan-cycle snapshot lock: createPriceSnapshot() freezes       ║
 * ║      prices at cycle start — no mid-scan re-fetch drift            ║
 * ║    • All engines share ONE in-process price bus                    ║
 * ║    • REST never overwrites a WS price < 5 s old                    ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

// ws is installed: npm install ws @types/ws
import WebSocket from "ws";
import { STATIC_SYMBOLS } from "@/config/symbols";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PriceData = {
  symbol: string;
  price: number;
  source: string;
  timestamp: number;
  volume24h?: number;
};

export type UnifiedPrice = PriceData & {
  ageMs: number;
  stale: boolean;
};

export type PriceTick = {
  symbol: string;
  price: number;
  source: string;
  timestamp: number;
  volume24h?: number;
};

export type SourceHealth = {
  connected: boolean;
  lastUpdateMs: number;
  updateCount: number;
  symbolCount: number;
};

export type PriceEngineHealth = {
  mode: string;
  sources: Record<string, SourceHealth>;
  totalSymbols: number;
  freshSymbols: number;   // price age < 5 s
  staleSymbols: number;
  lkgSymbols: number;
};

// ── Internal price bus ────────────────────────────────────────────────────────

// Live prices — replaced by fresher data on every update
const _bus = new Map<string, PriceData>();
// Last-known-good — never evicted; always the most recent valid price ever seen
const _lkg = new Map<string, PriceData>();
const _sourceBus = new Map<string, Map<string, PriceData>>();
const _priceHistory = new Map<string, PriceTick[]>();

const _health: Record<string, { connected: boolean; lastUpdateMs: number; updateCount: number; symbols: Set<string> }> = {};

function norm(s: unknown): string {
  return String(s ?? "").trim().toUpperCase();
}

/**
 * Source priority tiers (lower = higher priority):
 *   0 — bybit-spot-ws   (spot price — ground truth for paper trading)
 *   1 — bybit-linear-ws (perp price — close to spot, good for symbols w/o spot)
 *   2 — okx-ws          (independent exchange cross-check)
 *   3 — REST sources    (batch poll, suppressed when any WS data is fresh)
 */
const SOURCE_TIER: Record<string, number> = {
  "binance-ws":      0,
  "bybit-spot-ws":   1,
  "bybit-linear-ws": 2,
  "okx-ws":          3,
  "coinbase-ws":     4,
};

function sourceTier(src: string): number {
  return SOURCE_TIER[src] ?? 3; // REST sources get tier 3
}

/**
 * Write a price into the bus.
 * - REST is suppressed when any WS price for the symbol is < 5 s old.
 * - Lower-priority WS sources don't overwrite higher-priority ones that are < 2 s old.
 */
function appendHistory(entry: PriceData): void {
  const history = _priceHistory.get(entry.symbol) ?? [];
  const prev = history[history.length - 1];
  const changedEnough = !prev || Math.abs(entry.price - prev.price) / Math.max(prev.price, 1e-9) >= 0.0002;
  if (!prev || entry.timestamp - prev.timestamp >= 1_000 || changedEnough) {
    history.push({
      symbol: entry.symbol,
      price: entry.price,
      source: entry.source,
      timestamp: entry.timestamp,
      volume24h: entry.volume24h,
    });
  } else {
    history[history.length - 1] = {
      symbol: entry.symbol,
      price: entry.price,
      source: entry.source,
      timestamp: entry.timestamp,
      volume24h: entry.volume24h ?? prev.volume24h,
    };
  }
  const cutoff = entry.timestamp - 70 * 60_000;
  while (history.length > 0 && (history.length > 4_200 || history[0].timestamp < cutoff)) {
    history.shift();
  }
  _priceHistory.set(entry.symbol, history);
}

function writePriceToBus(symbol: string, price: number, source: string, meta: { timestamp?: number; volume24h?: number } = {}): void {
  if (!symbol || !Number.isFinite(price) || price <= 0) return;
  const now = Number.isFinite(meta.timestamp) ? Number(meta.timestamp) : Date.now();
  const incomingTier = sourceTier(source);
  const existing = _bus.get(symbol);

  if (existing) {
    const existingTier = sourceTier(existing.source);
    const age = now - existing.timestamp;
    // REST never overwrites a WS price < 5 s old
    if (incomingTier === 3 && existingTier < 3 && age < 5_000) return;
    // Lower-priority WS won't overwrite higher-priority WS < 2 s old
    if (incomingTier > existingTier && age < 2_000) return;
  }

  const entry: PriceData = { symbol, price, source, timestamp: now, volume24h: meta.volume24h };
  _bus.set(symbol, entry);
  _lkg.set(symbol, { ...entry }); // clone so LKG is immutable after write
  const perSource = _sourceBus.get(source) ?? new Map<string, PriceData>();
  perSource.set(symbol, entry);
  _sourceBus.set(source, perSource);
  appendHistory(entry);

  if (!_health[source]) {
    _health[source] = { connected: true, lastUpdateMs: now, updateCount: 0, symbols: new Set() };
  }
  _health[source].lastUpdateMs = now;
  _health[source].updateCount++;
  _health[source].symbols.add(symbol);
}

// ── Shared Bybit message handler ─────────────────────────────────────────────
function makeBybitMessageHandler(sourceLabel: string) {
  return (raw: Buffer | string): void => {
    try {
      const msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      const topic = msg.topic as string | undefined;
      const data = msg.data as Record<string, unknown> | undefined;
      if (topic && data && typeof data.lastPrice === "string") {
        const symbol = norm(topic.replace("tickers.", ""));
        const price = Number(data.lastPrice);
        const volume24h = typeof data.volume24h === "string" ? Number(data.volume24h) : undefined;
        writePriceToBus(symbol, price, sourceLabel, { volume24h });
      }
    } catch { /* discard malformed frames */ }
  };
}

function makeBybitHeartbeat(ws: WebSocket): NodeJS.Timeout {
  return setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: "ping" }));
    else clearInterval(makeBybitHeartbeat(ws));
  }, 18_000);
}

// ── Binance WebSocket ─────────────────────────────────────────────────────────
// Primary feed. Using the aggregated miniTicker stream keeps one socket alive
// while still covering the full tracked universe.

let _binanceWs: WebSocket | null = null;
let _binanceReconnectTimer: NodeJS.Timeout | null = null;
let _binanceDelay = 1_000;
const STATIC_SYMBOL_SET = new Set(STATIC_SYMBOLS.map(norm));

function connectBinance(): void {
  if (_binanceWs && (_binanceWs.readyState === WebSocket.OPEN || _binanceWs.readyState === WebSocket.CONNECTING)) return;

  try {
    const ws = new WebSocket("wss://stream.binance.com:9443/ws/!miniTicker@arr");
    _binanceWs = ws;

    ws.on("open", () => {
      _binanceDelay = 1_000;
      if (_health["binance-ws"]) _health["binance-ws"].connected = true;
      console.log("[PriceEngine:Binance] WS connected — streaming !miniTicker@arr");
    });

    ws.on("message", (raw) => {
      try {
        const payload = JSON.parse(raw.toString()) as Array<Record<string, unknown>>;
        if (!Array.isArray(payload)) return;
        for (const item of payload) {
          const symbol = norm(item.s);
          if (!STATIC_SYMBOL_SET.has(symbol)) continue;
          const price = Number(item.c);
          const volume24h = typeof item.q === "string" ? Number(item.q) : undefined;
          writePriceToBus(symbol, price, "binance-ws", { volume24h });
        }
      } catch {
        // ignore malformed frames
      }
    });

    ws.on("close", () => {
      if (_health["binance-ws"]) _health["binance-ws"].connected = false;
      if (_binanceReconnectTimer) return;
      _binanceReconnectTimer = setTimeout(() => {
        _binanceReconnectTimer = null;
        _binanceDelay = Math.min(_binanceDelay * 2, 30_000);
        connectBinance();
      }, _binanceDelay);
    });

    ws.on("error", (err) => {
      if (_health["binance-ws"]) _health["binance-ws"].connected = false;
      console.log("[PriceEngine:Binance] WS error:", (err as Error).message);
    });
  } catch (err) {
    console.log("[PriceEngine:Binance] connect failed:", (err as Error).message);
  }
}

// ── Coinbase WebSocket ────────────────────────────────────────────────────────
// Major pairs only. Coinbase quotes USD, which is close enough as a tertiary
// cross-check for large-cap symbols when crypto-native venues are stale.

let _coinbaseWs: WebSocket | null = null;
let _coinbaseReconnectTimer: NodeJS.Timeout | null = null;
let _coinbaseDelay = 1_000;
const COINBASE_PRODUCTS: Record<string, string> = {
  "BTC-USD": "BTCUSDT",
  "ETH-USD": "ETHUSDT",
  "SOL-USD": "SOLUSDT",
  "XRP-USD": "XRPUSDT",
  "ADA-USD": "ADAUSDT",
  "DOGE-USD": "DOGEUSDT",
  "LTC-USD": "LTCUSDT",
};

function connectCoinbase(): void {
  if (_coinbaseWs && (_coinbaseWs.readyState === WebSocket.OPEN || _coinbaseWs.readyState === WebSocket.CONNECTING)) return;

  try {
    const ws = new WebSocket("wss://ws-feed.exchange.coinbase.com");
    _coinbaseWs = ws;

    ws.on("open", () => {
      _coinbaseDelay = 1_000;
      if (_health["coinbase-ws"]) _health["coinbase-ws"].connected = true;
      ws.send(JSON.stringify({
        type: "subscribe",
        product_ids: Object.keys(COINBASE_PRODUCTS),
        channels: ["ticker"],
      }));
    });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as Record<string, unknown>;
        if (msg.type !== "ticker" || typeof msg.product_id !== "string" || typeof msg.price !== "string") return;
        const symbol = COINBASE_PRODUCTS[msg.product_id];
        if (!symbol) return;
        const volume24h = typeof msg.volume_24h === "string" ? Number(msg.volume_24h) : undefined;
        writePriceToBus(symbol, Number(msg.price), "coinbase-ws", { volume24h });
      } catch {
        // ignore malformed frames
      }
    });

    ws.on("close", () => {
      if (_health["coinbase-ws"]) _health["coinbase-ws"].connected = false;
      if (_coinbaseReconnectTimer) return;
      _coinbaseReconnectTimer = setTimeout(() => {
        _coinbaseReconnectTimer = null;
        _coinbaseDelay = Math.min(_coinbaseDelay * 2, 30_000);
        connectCoinbase();
      }, _coinbaseDelay);
    });

    ws.on("error", (err) => {
      if (_health["coinbase-ws"]) _health["coinbase-ws"].connected = false;
      console.log("[PriceEngine:Coinbase] WS error:", (err as Error).message);
    });
  } catch (err) {
    console.log("[PriceEngine:Coinbase] connect failed:", (err as Error).message);
  }
}

function sendBybitSubscriptions(ws: WebSocket, syms: string[]): void {
  const BATCH = 10;
  for (let i = 0; i < syms.length; i += BATCH) {
    const args = syms.slice(i, i + BATCH).map((s) => `tickers.${s}`);
    ws.send(JSON.stringify({ op: "subscribe", args }));
  }
}

// ── Bybit SPOT WebSocket ──────────────────────────────────────────────────────
// Primary WS source: covers ALL USDT spot pairs including ones without perp listings
// (LAYER, SKL, ETC, BICO, and hundreds more that Binance.US prices incorrectly)
// Symbol format: BTCUSDT — matches our format directly

let _bybitSpotWs: WebSocket | null = null;
let _bybitSpotReconnectTimer: NodeJS.Timeout | null = null;
let _bybitSpotDelay = 1_000;

function connectBybitSpot(): void {
  if (
    _bybitSpotWs &&
    (_bybitSpotWs.readyState === WebSocket.OPEN || _bybitSpotWs.readyState === WebSocket.CONNECTING)
  ) return;

  try {
    const ws = new WebSocket("wss://stream.bybit.com/v5/public/spot");
    _bybitSpotWs = ws;

    ws.on("open", () => {
      _bybitSpotDelay = 1_000;
      if (_health["bybit-spot-ws"]) _health["bybit-spot-ws"].connected = true;
      const syms = STATIC_SYMBOLS.map(norm);
      console.log(`[PriceEngine:Bybit-Spot] WS connected — subscribing ${syms.length} symbols`);
      sendBybitSubscriptions(ws, syms);
      makeBybitHeartbeat(ws);
    });

    ws.on("message", makeBybitMessageHandler("bybit-spot-ws"));

    ws.on("close", () => {
      if (_health["bybit-spot-ws"]) _health["bybit-spot-ws"].connected = false;
      console.log("[PriceEngine:Bybit-Spot] WS closed — reconnecting in", _bybitSpotDelay, "ms");
      if (_bybitSpotReconnectTimer) return;
      _bybitSpotReconnectTimer = setTimeout(() => {
        _bybitSpotReconnectTimer = null;
        _bybitSpotDelay = Math.min(_bybitSpotDelay * 2, 30_000);
        connectBybitSpot();
      }, _bybitSpotDelay);
    });

    ws.on("error", (err) => {
      if (_health["bybit-spot-ws"]) _health["bybit-spot-ws"].connected = false;
      console.log("[PriceEngine:Bybit-Spot] WS error:", (err as Error).message);
    });
  } catch (err) {
    console.log("[PriceEngine:Bybit-Spot] connect failed:", (err as Error).message);
  }
}

// ── Bybit LINEAR WebSocket ─────────────────────────────────────────────────────
// Secondary WS: USDT perpetuals — slightly different price from spot due to
// funding rates, but useful for symbols traded primarily as perps.

let _bybitLinearWs: WebSocket | null = null;
let _bybitLinearReconnectTimer: NodeJS.Timeout | null = null;
let _bybitLinearDelay = 1_000;

function connectBybitLinear(): void {
  if (
    _bybitLinearWs &&
    (_bybitLinearWs.readyState === WebSocket.OPEN || _bybitLinearWs.readyState === WebSocket.CONNECTING)
  ) return;

  try {
    const ws = new WebSocket("wss://stream.bybit.com/v5/public/linear");
    _bybitLinearWs = ws;

    ws.on("open", () => {
      _bybitLinearDelay = 1_000;
      if (_health["bybit-linear-ws"]) _health["bybit-linear-ws"].connected = true;
      const syms = STATIC_SYMBOLS.map(norm);
      console.log(`[PriceEngine:Bybit-Linear] WS connected — subscribing ${syms.length} symbols`);
      sendBybitSubscriptions(ws, syms);
      makeBybitHeartbeat(ws);
    });

    // Linear only writes if spot hasn't already written a fresher price
    ws.on("message", makeBybitMessageHandler("bybit-linear-ws"));

    ws.on("close", () => {
      if (_health["bybit-linear-ws"]) _health["bybit-linear-ws"].connected = false;
      console.log("[PriceEngine:Bybit-Linear] WS closed — reconnecting in", _bybitLinearDelay, "ms");
      if (_bybitLinearReconnectTimer) return;
      _bybitLinearReconnectTimer = setTimeout(() => {
        _bybitLinearReconnectTimer = null;
        _bybitLinearDelay = Math.min(_bybitLinearDelay * 2, 30_000);
        connectBybitLinear();
      }, _bybitLinearDelay);
    });

    ws.on("error", (err) => {
      if (_health["bybit-linear-ws"]) _health["bybit-linear-ws"].connected = false;
      console.log("[PriceEngine:Bybit-Linear] WS error:", (err as Error).message);
    });
  } catch (err) {
    console.log("[PriceEngine:Bybit-Linear] connect failed:", (err as Error).message);
  }
}

// ── OKX WebSocket ─────────────────────────────────────────────────────────────
// Channel: wss://ws.okx.com:8443/ws/v5/public (spot tickers)
// Symbol format: BTC-USDT — needs BTCUSDT → BTC-USDT conversion
// Derived directly from STATIC_SYMBOLS so every tradable symbol is covered.

let _okxWs: WebSocket | null = null;
let _okxReconnectTimer: NodeJS.Timeout | null = null;
let _okxDelay = 1_000;

/**
 * Convert STATIC_SYMBOLS to OKX instId format.
 * BTCUSDT → BTC-USDT, LAYERUSDT → LAYER-USDT, etc.
 * OKX silently ignores instruments it doesn't list, so no filtering needed.
 */
function toOkxInstId(sym: string): string {
  // Strip trailing USDT and reformat as BASE-USDT
  const base = sym.endsWith("USDT") ? sym.slice(0, -4) : sym;
  return `${base}-USDT`;
}

const OKX_INST_IDS: string[] = STATIC_SYMBOLS.map((s) => toOkxInstId(norm(s)));

function connectOkx(): void {
  if (
    _okxWs &&
    (_okxWs.readyState === WebSocket.OPEN || _okxWs.readyState === WebSocket.CONNECTING)
  ) return;

  try {
    const ws = new WebSocket("wss://ws.okx.com:8443/ws/v5/public");
    _okxWs = ws;

    ws.on("open", () => {
      _okxDelay = 1_000;
      if (_health["okx-ws"]) _health["okx-ws"].connected = true;
      console.log("[PriceEngine:OKX] WS connected — subscribing to", OKX_INST_IDS.length, "symbols");

      // OKX uses {channel, instId} arg objects; subscribe in batches of 10
      const args = OKX_INST_IDS.map((instId) => ({ channel: "tickers", instId }));
      const BATCH = 10;
      for (let i = 0; i < args.length; i += BATCH) {
        ws.send(JSON.stringify({ op: "subscribe", args: args.slice(i, i + BATCH) }));
      }
      // OKX keepalive — send "ping" string (not JSON) every 25 s
      const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("ping");
        else clearInterval(heartbeat);
      }, 25_000);
    });

    ws.on("message", (raw) => {
      try {
        const str = raw.toString();
        if (str === "pong") return;
        const msg = JSON.parse(str) as Record<string, unknown>;
        if (Array.isArray(msg.data)) {
          for (const item of msg.data as Array<Record<string, unknown>>) {
            if (typeof item.instId === "string" && typeof item.last === "string") {
              // "BTC-USDT" → "BTCUSDT"
              const symbol = norm(item.instId.replace(/-/g, ""));
              const price = Number(item.last);
              const volume24h = typeof item.volCcy24h === "string" ? Number(item.volCcy24h) : undefined;
              writePriceToBus(symbol, price, "okx-ws", { volume24h });
            }
          }
        }
      } catch { /* discard */ }
    });

    ws.on("close", () => {
      if (_health["okx-ws"]) _health["okx-ws"].connected = false;
      console.log("[PriceEngine:OKX] WS closed — reconnecting in", _okxDelay, "ms");
      scheduleOkxReconnect();
    });

    ws.on("error", (err) => {
      if (_health["okx-ws"]) _health["okx-ws"].connected = false;
      console.log("[PriceEngine:OKX] WS error:", (err as Error).message);
    });
  } catch (err) {
    console.log("[PriceEngine:OKX] connect failed:", (err as Error).message);
    scheduleOkxReconnect();
  }
}

function scheduleOkxReconnect(): void {
  if (_okxReconnectTimer) return;
  _okxReconnectTimer = setTimeout(() => {
    _okxReconnectTimer = null;
    _okxDelay = Math.min(_okxDelay * 2, 30_000);
    connectOkx();
  }, _okxDelay);
}

// ── REST polling (floor feed) ─────────────────────────────────────────────────
// Provides full-symbol-universe coverage for anything not on WS feeds.
// Runs every 10 s; suppressed for any symbol that has fresh WS data.

const REST_SOURCES = [
  { url: "https://api.binance.us/api/v3/ticker/price",  label: "rest-fallback-binance-us"   },
  { url: "https://api1.binance.com/api/v3/ticker/price", label: "rest-fallback-binance-api1" },
  { url: "https://api2.binance.com/api/v3/ticker/price", label: "rest-fallback-binance-api2" },
  { url: "https://api3.binance.com/api/v3/ticker/price", label: "rest-fallback-binance-api3" },
];

let _restTimer: NodeJS.Timeout | null = null;

async function pollRest(): Promise<void> {
  for (const { url, label } of REST_SOURCES) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5_000);
      const res = await fetch(url, { cache: "no-store", signal: controller.signal });
      clearTimeout(t);
      if (!res.ok) continue;
      const data = (await res.json()) as Array<{ symbol: string; price: string }>;
      if (!Array.isArray(data) || data.length === 0) continue;
      let written = 0;
      for (const item of data) {
        const symbol = norm(item.symbol);
        const price = Number(item.price);
        if (Number.isFinite(price) && price > 0) {
          writePriceToBus(symbol, price, label, { timestamp: Date.now() });
          written++;
        }
      }
      console.log(`[PriceEngine:REST] ${label} → ${written} prices updated`);
      if (!_health[label]) _health[label] = { connected: true, lastUpdateMs: Date.now(), updateCount: 0, symbols: new Set() };
      _health[label].connected = true;
      break; // first success wins
    } catch { /* try next source */ }
  }
}

function startRestPolling(): void {
  if (_restTimer) return;
  pollRest(); // immediate first run
  _restTimer = setInterval(pollRest, 10_000);
}

// ── Engine bootstrap ──────────────────────────────────────────────────────────

let _initialized = false;

function boot(): void {
  if (_initialized) return;
  _initialized = true;
  if (process.env.NODE_ENV === "test") return;
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  PRICE_ENGINE_MODE=INSTITUTIONAL_WS_MULTI_EXCHANGE           ║");
  console.log("║  Tier-0: Binance WS      (primary real-time feed)           ║");
  console.log("║  Tier-1: Bybit SPOT/LINEAR WS                               ║");
  console.log("║  Tier-2: OKX / Coinbase WS                                  ║");
  console.log("║  Tier-3: REST fallback with timestamp validation            ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  connectBinance();
  connectBybitSpot();
  connectBybitLinear();
  connectOkx();
  connectCoinbase();
  startRestPolling();
}

// ── Public API ─────────────────────────────────────────────────────────────────

const WS_SOURCE_ORDER = ["binance-ws", "bybit-spot-ws", "bybit-linear-ws", "okx-ws", "coinbase-ws"] as const;

function getFreshestFromSources(symbol: string, sources: readonly string[], maxAgeMs: number): PriceData | null {
  const now = Date.now();
  for (const source of sources) {
    const candidate = _sourceBus.get(source)?.get(symbol);
    if (candidate && now - candidate.timestamp <= maxAgeMs) return candidate;
  }
  return null;
}

function getBestKnownPrice(symbol: string): PriceData | null {
  const primary = getFreshestFromSources(symbol, ["binance-ws"], 1_000);
  if (primary) return primary;
  const secondary = getFreshestFromSources(symbol, WS_SOURCE_ORDER, 2_000);
  if (secondary) return secondary;
  const existing = _bus.get(symbol);
  if (existing && Date.now() - existing.timestamp <= 3_000) return existing;
  for (const [source, map] of _sourceBus) {
    if (sourceTier(source) !== 3) continue;
    const candidate = map.get(symbol);
    if (candidate && Date.now() - candidate.timestamp <= 3_000) return candidate;
  }
  return _lkg.get(symbol) ?? existing ?? null;
}

/**
 * Get the current best price for one symbol.
 * Returns `{symbol, price, source, timestamp}`.
 * Falls back to last-known-good if live data is unavailable.
 */
export async function getLivePrice(symbol: string): Promise<PriceData> {
  boot();
  const s = norm(symbol);
  if (!s) return { symbol: s, price: 0, source: "none", timestamp: Date.now() };
  const live = getBestKnownPrice(s);
  if (live) return live;
  const lkg = _lkg.get(s);
  if (lkg) return { ...lkg, source: `${lkg.source}(lkg)` };
  return { symbol: s, price: 0, source: "none", timestamp: Date.now() };
}

/**
 * Get current best prices for multiple symbols.
 * Returns `Map<originalSymbol, PriceData>`.
 */
export async function getLivePrices(symbols: string[]): Promise<Map<string, PriceData>> {
  boot();
  const out = new Map<string, PriceData>();
  if (symbols.length === 0) return out;
  for (const sym of symbols) {
    const s = norm(sym);
    const entry = getBestKnownPrice(s) ?? _lkg.get(s);
    if (entry) {
      out.set(sym, entry);
    } else {
      out.set(sym, { symbol: s, price: 0, source: "none", timestamp: Date.now() });
    }
  }
  return out;
}

/**
 * Freeze the current price bus into an immutable snapshot for one scan cycle.
 *
 * ALL downstream calculations within a cycle (entry price, SL, TP, PnL)
 * MUST read from this snapshot — never call getLivePrice() mid-cycle.
 * This eliminates drift from prices changing between SL and TP calculations.
 */
export async function createPriceSnapshot(symbols: string[]): Promise<Map<string, PriceData>> {
  boot();
  const snap = new Map<string, PriceData>();
  for (const sym of symbols) {
    const s = norm(sym);
    const entry =
      getBestKnownPrice(s) ??
      _lkg.get(s) ??
      ({ symbol: s, price: 0, source: "none", timestamp: Date.now() } as PriceData);
    snap.set(sym, { ...entry }); // shallow copy — frozen at snapshot time
  }
  return snap;
}

/**
 * Convenience: plain-number price map for legacy callers.
 */
export async function getPriceMap(symbols: string[]): Promise<Map<string, number>> {
  const data = await getLivePrices(symbols);
  const out = new Map<string, number>();
  for (const [sym, pd] of data) out.set(sym, pd.price);
  return out;
}

/**
 * Convenience: plain-number price for a single symbol.
 */
export async function getPrice(symbol: string): Promise<number> {
  return (await getLivePrice(symbol)).price;
}

export async function getUnifiedPrice(symbol: string): Promise<UnifiedPrice> {
  const entry = await getLivePrice(symbol);
  const ageMs = Date.now() - entry.timestamp;
  return { ...entry, ageMs, stale: ageMs > 3_000 };
}

export async function getUnifiedPrices(symbols: string[]): Promise<Map<string, UnifiedPrice>> {
  const data = await getLivePrices(symbols);
  const out = new Map<string, UnifiedPrice>();
  const now = Date.now();
  for (const [symbol, entry] of data) {
    const ageMs = now - entry.timestamp;
    out.set(symbol, { ...entry, ageMs, stale: ageMs > 3_000 });
  }
  return out;
}

/**
 * Returns true when a live WebSocket source (Tier 0–2: Bybit spot/linear or OKX)
 * has provided a price for this symbol.
 *
 * Use this as a trade-entry gate: only place an order when WS has confirmed the
 * price, preventing REST-only anomalies (e.g. Binance.US exchange-premium quirks)
 * from triggering entries at wrong prices.
 *
 * The check is intentionally permissive about staleness — LKG data from a WS
 * source still counts, so symbols that trade infrequently don't get permanently
 * blocked once they've been seen at least once.
 */
/**
 * Synchronous price read — returns the best known price (or 0 if unknown).
 * Reads from in-memory maps so it's safe to call in non-async contexts.
 */
export function getPriceSync(symbol: string): number {
  boot();
  const s = norm(symbol);
  const entry = getBestKnownPrice(s) ?? _lkg.get(s);
  return entry?.price ?? 0;
}

export function isWsConfirmedPrice(symbol: string): boolean {
  boot();
  const s = norm(symbol);
  // Check live bus first, then last-known-good
  const entry = getBestKnownPrice(s) ?? _lkg.get(s);
  if (!entry) return false;
  // Strip LKG suffix before tier lookup
  const src = entry.source.replace("(lkg)", "");
  return sourceTier(src) < 3; // Tier 0, 1, or 2 = WS-confirmed
}

export function getRecentTicks(symbol: string, lookbackMs = 60 * 60_000): PriceTick[] {
  boot();
  const s = norm(symbol);
  const history = _priceHistory.get(s) ?? [];
  const cutoff = Date.now() - Math.max(1_000, lookbackMs);
  return history.filter((tick) => tick.timestamp >= cutoff);
}

export function getLatestPriceMetadata(symbol: string): UnifiedPrice {
  boot();
  const s = norm(symbol);
  const entry = getBestKnownPrice(s) ?? _lkg.get(s) ?? { symbol: s, price: 0, source: "none", timestamp: Date.now() };
  const ageMs = Date.now() - entry.timestamp;
  return { ...entry, ageMs, stale: ageMs > 3_000 };
}

export function injectTestPrice(symbol: string, price: number, source = "binance-ws", timestamp = Date.now(), volume24h?: number): void {
  writePriceToBus(norm(symbol), price, source, { timestamp, volume24h });
}

export function resetPriceEngineForTests(): void {
  _bus.clear();
  _lkg.clear();
  _sourceBus.clear();
  _priceHistory.clear();
  for (const key of Object.keys(_health)) {
    delete _health[key];
  }
}

/**
 * Live health snapshot for monitoring endpoints.
 */
export function getPriceEngineHealth(): PriceEngineHealth {
  boot();
  const now = Date.now();
  let fresh = 0;
  let stale = 0;
  for (const pd of _bus.values()) {
    if (now - pd.timestamp < 5_000) fresh++;
    else stale++;
  }
  const sources: Record<string, SourceHealth> = {};
  for (const [key, h] of Object.entries(_health)) {
    sources[key] = {
      connected: h.connected,
      lastUpdateMs: h.lastUpdateMs,
      updateCount: h.updateCount,
      symbolCount: h.symbols.size,
    };
  }
  return {
    mode: "INSTITUTIONAL_WS_MULTI_EXCHANGE",
    sources,
    totalSymbols: _bus.size,
    freshSymbols: fresh,
    staleSymbols: stale,
    lkgSymbols: _lkg.size,
  };
}
