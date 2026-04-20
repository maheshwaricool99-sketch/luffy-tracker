/**
 * GLOBAL TRADE REGISTRY
 *
 * Pure in-memory, zero-persistence deduplication layer.
 * Cleared and rebuilt from tradeStore on every server start.
 *
 * Provides O(1) dedup across ALL engines before any claim or risk check.
 * Key format: `${SYMBOL}:${SIDE}` (e.g. "BTCUSDT:LONG").
 *
 * Lifecycle per trade:
 *   tryClaim()    — before portfolioController pipeline starts
 *   confirmClaim() — after executionService.open() succeeds
 *   releaseClaim() — if any step between tryClaim and confirm fails
 *   closeTrade()   — when executionService.close() runs
 */

// ── State ─────────────────────────────────────────────────────────────────────

const _activeKeys  = new Set<string>();                              // symbol:side → trade open
const _pendingKeys = new Map<string, { engine: string; ts: number }>(); // symbol:side → in-flight

const PENDING_TTL_MS = 30_000; // auto-expire pending claims after 30s

// ── Helpers ───────────────────────────────────────────────────────────────────

export function makeTradeKey(symbol: string, side: string): string {
  return `${symbol.toUpperCase()}:${side.toUpperCase()}`;
}

function sweepStalePending(): void {
  const now = Date.now();
  for (const [key, val] of _pendingKeys) {
    if (now - val.ts > PENDING_TTL_MS) {
      _pendingKeys.delete(key);
      console.log(`[GlobalTradeRegistry] pending expired (stale >30s): ${key}`);
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Attempt to reserve a symbol+side slot.
 * Blocks if there is already an active trade OR an in-flight pending claim.
 */
export function tryClaim(
  key: string,
  engine: string,
): { ok: true } | { ok: false; reason: string } {
  sweepStalePending();

  if (_activeKeys.has(key)) {
    console.log(`[GlobalTradeRegistry] claim.rejected | key=${key} engine=${engine} reason=ACTIVE_DUPLICATE`);
    return { ok: false, reason: "ACTIVE_DUPLICATE" };
  }

  const pending = _pendingKeys.get(key);
  if (pending) {
    console.log(
      `[GlobalTradeRegistry] claim.rejected | key=${key} engine=${engine} ` +
      `reason=PENDING_DUPLICATE (held by ${pending.engine} for ${Date.now() - pending.ts}ms)`,
    );
    return { ok: false, reason: "PENDING_DUPLICATE" };
  }

  _pendingKeys.set(key, { engine, ts: Date.now() });
  console.log(`[GlobalTradeRegistry] claim.granted | key=${key} engine=${engine}`);
  return { ok: true };
}

/**
 * Promote pending → active after trade opens successfully.
 */
export function confirmClaim(key: string): void {
  _pendingKeys.delete(key);
  _activeKeys.add(key);
}

/**
 * Release a pending claim on order failure (before trade was opened).
 */
export function releaseClaim(key: string): void {
  if (_pendingKeys.has(key)) {
    _pendingKeys.delete(key);
    console.log(`[GlobalTradeRegistry] claim.released (order failed) | key=${key}`);
  }
}

/**
 * Deregister an active trade on close.
 */
export function closeTrade(key: string): void {
  _activeKeys.delete(key);
  console.log(`[GlobalTradeRegistry] trade.deregistered | key=${key}`);
}

/** Returns true if the key is active or pending. */
export function isRegistered(key: string): boolean {
  sweepStalePending();
  return _activeKeys.has(key) || _pendingKeys.has(key);
}

/**
 * Hard reset — wipes all active and pending registrations.
 * Called on server startup and admin resets.
 */
export function hardReset(): void {
  const a = _activeKeys.size;
  const p = _pendingKeys.size;
  _activeKeys.clear();
  _pendingKeys.clear();
  console.log(`[GlobalTradeRegistry] Hard reset — cleared ${a} active, ${p} pending keys`);
}

/**
 * Rebuild from a list of currently open trades.
 * Called after tradeStore loads from disk on startup.
 */
export function rebuildFromOpenTrades(trades: { symbol: string; side: string }[]): void {
  _activeKeys.clear();
  _pendingKeys.clear();
  for (const t of trades) {
    _activeKeys.add(makeTradeKey(t.symbol, t.side));
  }
  console.log(`[GlobalTradeRegistry] Rebuilt — ${_activeKeys.size} active keys from ${trades.length} open trades`);
}

/**
 * Sweep pending claims older than PENDING_TTL_MS.
 * Call this on every engine cycle.
 */
export function sweepPending(): void {
  sweepStalePending();
}

/**
 * Debug snapshot for /api/debug/global-claims.
 */
export function getSnapshot(): {
  activeCount:  number;
  pendingCount: number;
  activeKeys:   string[];
  pendingKeys:  { key: string; engine: string; ageMs: number }[];
} {
  sweepStalePending();
  const now = Date.now();
  return {
    activeCount:  _activeKeys.size,
    pendingCount: _pendingKeys.size,
    activeKeys:   [..._activeKeys].sort(),
    pendingKeys:  [..._pendingKeys.entries()].map(([key, val]) => ({
      key,
      engine: val.engine,
      ageMs:  now - val.ts,
    })),
  };
}
