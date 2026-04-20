/**
 * MARKET SNAPSHOT — CENTRAL STORE + CONTINUOUS SCANNING ENGINE
 *
 * Runs a persistent background loop that scans all curated symbols,
 * computes signals, and stores results in a module-level snapshot.
 * All UI reads from this store via the /api/market-snapshot endpoint.
 *
 * Watchdog: if lastScanMs stops updating for > WATCHDOG_THRESHOLD_MS, restarts.
 */

import { runSymbolPipelineSafe } from "./pipeline";
import type {
  MarketBias,
  MarketSignal,
  ScannerSnapshot,
  SignalLogEntry,
} from "./types";
import type { MarketId } from "@/lib/market-data/shared/types";

// ── Curated scanning universe ─────────────────────────────────────────────────

type UniverseEntry = { symbol: string; name: string; marketId: MarketId };

const SCAN_UNIVERSE: UniverseEntry[] = [
  // Core crypto (highest liquidity + richest metrics)
  { symbol: "BTCUSDT",     name: "Bitcoin",       marketId: "crypto" },
  { symbol: "ETHUSDT",     name: "Ethereum",      marketId: "crypto" },
  { symbol: "SOLUSDT",     name: "Solana",        marketId: "crypto" },
  { symbol: "BNBUSDT",     name: "BNB",           marketId: "crypto" },
  { symbol: "XRPUSDT",     name: "XRP",           marketId: "crypto" },
  { symbol: "ADAUSDT",     name: "Cardano",       marketId: "crypto" },
  { symbol: "AVAXUSDT",    name: "Avalanche",     marketId: "crypto" },
  { symbol: "DOTUSDT",     name: "Polkadot",      marketId: "crypto" },
  { symbol: "LINKUSDT",    name: "Chainlink",     marketId: "crypto" },
  { symbol: "UNIUSDT",     name: "Uniswap",       marketId: "crypto" },
  { symbol: "AAVEUSDT",    name: "Aave",          marketId: "crypto" },
  { symbol: "INJUSDT",     name: "Injective",     marketId: "crypto" },
  { symbol: "SUIUSDT",     name: "Sui",           marketId: "crypto" },
  { symbol: "APTUSDT",     name: "Aptos",         marketId: "crypto" },
  { symbol: "ARBUSDT",     name: "Arbitrum",      marketId: "crypto" },
  { symbol: "OPUSDT",      name: "Optimism",      marketId: "crypto" },
  { symbol: "EIGENUSDT",   name: "EigenLayer",    marketId: "crypto" },
  { symbol: "RENDERUSDT",  name: "Render",        marketId: "crypto" },
  { symbol: "STXUSDT",     name: "Stacks",        marketId: "crypto" },
  { symbol: "NEARUSDT",    name: "NEAR Protocol", marketId: "crypto" },
  { symbol: "ATOMUSDT",    name: "Cosmos",        marketId: "crypto" },
  { symbol: "LTCUSDT",     name: "Litecoin",      marketId: "crypto" },
  { symbol: "DOGEUSDT",    name: "Dogecoin",      marketId: "crypto" },
  { symbol: "PEPEUSDT",    name: "Pepe",          marketId: "crypto" },
  { symbol: "WIFUSDT",     name: "dogwifhat",     marketId: "crypto" },
  // High-conviction US stocks (AI/tech/crypto-adjacent)
  { symbol: "NVDA",        name: "NVIDIA",               marketId: "us" },
  { symbol: "MSFT",        name: "Microsoft",            marketId: "us" },
  { symbol: "AAPL",        name: "Apple",                marketId: "us" },
  { symbol: "META",        name: "Meta",                 marketId: "us" },
  { symbol: "GOOGL",       name: "Alphabet",             marketId: "us" },
  { symbol: "AMZN",        name: "Amazon",               marketId: "us" },
  { symbol: "TSLA",        name: "Tesla",                marketId: "us" },
  { symbol: "AMD",         name: "AMD",                  marketId: "us" },
  { symbol: "PLTR",        name: "Palantir",             marketId: "us" },
  { symbol: "MSTR",        name: "MicroStrategy",        marketId: "us" },
  { symbol: "SMCI",        name: "Super Micro Computer", marketId: "us" },
  { symbol: "SOUN",        name: "SoundHound AI",        marketId: "us" },
  { symbol: "CLSK",        name: "CleanSpark",           marketId: "us" },
  { symbol: "INTC",        name: "Intel",                marketId: "us" },
];

const BATCH_SIZE = 3;
const TICK_INTERVAL_MS = 15_000;
const WATCHDOG_THRESHOLD_MS = 120_000;
const MAX_LOG_ENTRIES = 100;

// ── Internal state ────────────────────────────────────────────────────────────

type StoreState = {
  signals: Map<string, MarketSignal>;
  signalLog: SignalLogEntry[];
  lastScanMs: number;
  scanCount: number;
  totalSymbolsScanned: number;
  started: boolean;
  batchIndex: number;
  timer: ReturnType<typeof setInterval> | null;
};

const state: StoreState = {
  signals: new Map(),
  signalLog: [],
  lastScanMs: 0,
  scanCount: 0,
  totalSymbolsScanned: 0,
  started: false,
  batchIndex: 0,
  timer: null,
};

// ── Batch scan tick ───────────────────────────────────────────────────────────

async function scanBatch(): Promise<void> {
  const start = state.batchIndex * BATCH_SIZE;
  const batch = SCAN_UNIVERSE.slice(start, start + BATCH_SIZE);
  if (batch.length === 0) return;

  // Sequential to avoid concurrent HTTP bursts against external APIs.
  const results: Awaited<ReturnType<typeof runSymbolPipelineSafe>>[] = [];
  for (const entry of batch) {
    results.push(await runSymbolPipelineSafe(entry.symbol, entry.name, entry.marketId));
  }

  const now = Date.now();
  for (const signal of results) {
    state.signals.set(signal.symbol, signal);
    state.totalSymbolsScanned += 1;

    if (signal.classification !== "IGNORE") {
      const entry: SignalLogEntry = {
        ts: now,
        symbol: signal.symbol,
        classification: signal.classification,
        direction: signal.decision.direction,
        score: signal.signalScore,
        reason: signal.decision.reason,
      };
      state.signalLog.unshift(entry);
      if (state.signalLog.length > MAX_LOG_ENTRIES) {
        state.signalLog.length = MAX_LOG_ENTRIES;
      }
    }
  }

  state.lastScanMs = now;
  if (start + BATCH_SIZE >= SCAN_UNIVERSE.length) {
    state.batchIndex = 0;
    state.scanCount += 1;
  } else {
    state.batchIndex += 1;
  }
}

// ── Watchdog ──────────────────────────────────────────────────────────────────

function checkWatchdog(): void {
  if (state.lastScanMs > 0 && Date.now() - state.lastScanMs > WATCHDOG_THRESHOLD_MS) {
    console.warn("[MarketSnapshot] Watchdog triggered — scanner stalled. Restarting.");
    stopScanner();
    startScanner();
  }
}

// ── Scanner lifecycle ─────────────────────────────────────────────────────────

function stopScanner(): void {
  if (state.timer !== null) {
    clearInterval(state.timer);
    state.timer = null;
  }
  state.started = false;
}

function startScanner(): void {
  if (state.started) return;
  state.started = true;
  state.batchIndex = 0;

  const tick = async () => {
    try {
      await scanBatch();
    } catch (err) {
      console.error("[MarketSnapshot] Scan tick failed:", err instanceof Error ? err.message : err);
    }
    checkWatchdog();
  };

  void tick();
  state.timer = setInterval(() => void tick(), TICK_INTERVAL_MS);
  console.log(`[MarketSnapshot] Scanner started — ${SCAN_UNIVERSE.length} symbols, batch=${BATCH_SIZE}, interval=${TICK_INTERVAL_MS}ms`);
}

// ── Public API ────────────────────────────────────────────────────────────────

export function ensureScannerStarted(): void {
  if (!state.started) startScanner();
}

function buildMarketBias(signals: MarketSignal[]): MarketBias {
  let bullishCount = 0;
  let bearishCount = 0;
  let noneCount = 0;

  for (const s of signals) {
    if (s.decision.direction === "LONG")  bullishCount++;
    else if (s.decision.direction === "SHORT") bearishCount++;
    else noneCount++;
  }

  let direction: MarketBias["direction"];
  if (bullishCount > bearishCount * 1.5) direction = "BULLISH";
  else if (bearishCount > bullishCount * 1.5) direction = "BEARISH";
  else direction = "NEUTRAL";

  return { direction, bullishCount, bearishCount, noneCount, totalScanned: signals.length };
}

export function getSnapshot(): ScannerSnapshot {
  ensureScannerStarted();

  const allSignals = [...state.signals.values()].sort((a, b) => b.signalScore - a.signalScore);
  const actionable = allSignals.filter((s) => s.classification !== "IGNORE");
  const topOpportunities = actionable.slice(0, 10);

  return {
    signals: allSignals,
    topOpportunities,
    marketBias: buildMarketBias(allSignals),
    lastScanMs: state.lastScanMs,
    scanCount: state.scanCount,
    totalSymbolsScanned: state.totalSymbolsScanned,
    healthy: state.lastScanMs > 0 && Date.now() - state.lastScanMs < WATCHDOG_THRESHOLD_MS,
    signalLog: [...state.signalLog],
  };
}
