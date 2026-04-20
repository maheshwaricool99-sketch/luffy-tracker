/**
 * PREDICTION CACHE — BACKGROUND SCANNER
 *
 * Continuously scans the full market universe for all three markets.
 * Results are stored in module-level Maps that are read instantly by the API.
 *
 * This decouples data freshness from page load time:
 *  - Page load reads cached rows → instant response
 *  - Background loop refreshes rows continuously → always fresh
 *
 * Scan strategy (per market, independent timers):
 *  - Crypto  : batch 5, tick 6 s  → ~500-symbol universe cycles in ~10 min
 *  - US      : batch 2, tick 12 s → ~5000-symbol universe (capped 300) in ~30 min
 *  - India   : batch 2, tick 12 s → ~2000-symbol universe (capped 300) in ~30 min
 */

import { getMarketSymbols } from "@/lib/market-data/shared/price-service";
import { getCatalystRows } from "@/lib/market-data/shared/catalyst-service";
import { computeSymbolSignal } from "@/lib/prediction-engine/service";
import type { MarketId, MarketSymbolInfo, PredictionSignal, CatalystRow } from "@/lib/market-data/shared/types";

// ── Per-market configuration ──────────────────────────────────────────────────

type MarketConfig = {
  batchSize: number;
  tickMs: number;
  universeCap: number;
};

const MARKET_CONFIG: Record<MarketId, MarketConfig> = {
  crypto: { batchSize: 4, tickMs: 10_000, universeCap: 150 },  // Binance futures top 150
  us:     { batchSize: 2, tickMs: 20_000, universeCap: 100 },  // Yahoo Finance rate limit
  india:  { batchSize: 2, tickMs: 20_000, universeCap: 100 },  // NSE rate limit
};

const CATALYST_REFRESH_MS = 5 * 60_000;  // refresh catalyst map every 5 min
const WATCHDOG_STALE_MS   = 3 * 60_000;  // restart market scanner if stalled 3 min

// ── State ─────────────────────────────────────────────────────────────────────

type MarketScanState = {
  signals:      Map<string, PredictionSignal>;
  universe:     MarketSymbolInfo[];
  catalystMap:  Map<string, CatalystRow>;
  batchIndex:   number;
  lastTickMs:   number;
  lastCatalystMs: number;
  timer:        ReturnType<typeof setInterval> | null;
  started:      boolean;
  cycleCount:   number;
};

function makeMarketState(): MarketScanState {
  return {
    signals:       new Map(),
    universe:      [],
    catalystMap:   new Map(),
    batchIndex:    0,
    lastTickMs:    0,
    lastCatalystMs: 0,
    timer:         null,
    started:       false,
    cycleCount:    0,
  };
}

const states: Record<MarketId, MarketScanState> = {
  crypto: makeMarketState(),
  us:     makeMarketState(),
  india:  makeMarketState(),
};

let globalStarted = false;

// ── Per-market tick ───────────────────────────────────────────────────────────

async function tick(marketId: MarketId): Promise<void> {
  const cfg   = MARKET_CONFIG[marketId];
  const state = states[marketId];

  // Reload universe if empty
  if (state.universe.length === 0) {
    try {
      const raw = await getMarketSymbols(marketId);
      state.universe = raw.slice(0, cfg.universeCap);
      console.log(`[PredictionCache:${marketId}] Universe loaded: ${state.universe.length} symbols`);
    } catch (err) {
      console.warn(`[PredictionCache:${marketId}] Universe load failed:`, err instanceof Error ? err.message : err);
      return;
    }
  }

  // Refresh catalyst map periodically
  if (Date.now() - state.lastCatalystMs > CATALYST_REFRESH_MS) {
    try {
      const rows = await getCatalystRows(marketId);
      state.catalystMap = new Map(rows.map((r) => [r.symbol, r]));
      state.lastCatalystMs = Date.now();
    } catch {
      // keep old map
    }
  }

  // Process next batch
  const start = state.batchIndex * cfg.batchSize;
  const batch = state.universe.slice(start, start + cfg.batchSize);

  if (batch.length === 0) {
    state.batchIndex = 0;
    state.cycleCount += 1;
    console.log(`[PredictionCache:${marketId}] Cycle ${state.cycleCount} complete. Cached: ${state.signals.size} signals.`);
    return;
  }

  for (const item of batch) {
    const signal = await computeSymbolSignal(item, marketId, state.catalystMap);
    if (signal) {
      state.signals.set(item.symbol, signal);
    } else {
      // Remove stale signal if symbol no longer qualifies
      state.signals.delete(item.symbol);
    }
  }

  state.batchIndex += 1;
  state.lastTickMs = Date.now();
}

// ── Watchdog ──────────────────────────────────────────────────────────────────

function checkWatchdog(marketId: MarketId): void {
  const state = states[marketId];
  if (state.lastTickMs > 0 && Date.now() - state.lastTickMs > WATCHDOG_STALE_MS) {
    console.warn(`[PredictionCache:${marketId}] Watchdog: scanner stalled, restarting.`);
    stopMarket(marketId);
    startMarket(marketId);
  }
}

// ── Market lifecycle ──────────────────────────────────────────────────────────

function stopMarket(marketId: MarketId): void {
  const state = states[marketId];
  if (state.timer !== null) { clearInterval(state.timer); state.timer = null; }
  state.started = false;
}

function startMarket(marketId: MarketId): void {
  const state = states[marketId];
  if (state.started) return;
  state.started = true;

  const cfg = MARKET_CONFIG[marketId];

  const run = async () => {
    try { await tick(marketId); } catch (err) {
      console.error(`[PredictionCache:${marketId}] Tick error:`, err instanceof Error ? err.message : err);
    }
    checkWatchdog(marketId);
  };

  // First tick immediately, then on interval
  void run();
  state.timer = setInterval(() => void run(), cfg.tickMs);
  console.log(`[PredictionCache:${marketId}] Started — batch=${cfg.batchSize} tick=${cfg.tickMs}ms cap=${cfg.universeCap}`);
}

// ── Public API ────────────────────────────────────────────────────────────────

export function ensurePredictionCacheStarted(): void {
  if (globalStarted) return;
  globalStarted = true;
  startMarket("crypto");
  // Stagger US and India starts to avoid cold-start API burst
  setTimeout(() => startMarket("us"),    8_000);
  setTimeout(() => startMarket("india"), 16_000);
}

export function getCachedPredictionSignals(marketId: MarketId): PredictionSignal[] {
  return [...states[marketId].signals.values()].sort((a, b) => b.signalScore - a.signalScore);
}

export function getPredictionCacheStatus() {
  return (Object.keys(states) as MarketId[]).map((m) => ({
    marketId:   m,
    cached:     states[m].signals.size,
    universe:   states[m].universe.length,
    batchIndex: states[m].batchIndex,
    cycleCount: states[m].cycleCount,
    lastTickMs: states[m].lastTickMs,
    started:    states[m].started,
  }));
}
