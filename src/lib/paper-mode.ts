/**
 * PAPER MODE — AUTHORITATIVE EXECUTION CONFIG
 *
 * This app is locked to paper trading only.
 * Live trading is permanently disabled at this layer.
 *
 * This module is the single source of truth for execution mode.
 * All engines, execution service, and API routes read from here.
 *
 * To re-enable live trading in a future version:
 *   1. Remove or relax the guards in this file
 *   2. Implement a signed exchange client
 *   3. Update execution-service.ts to route to the live client
 *   4. Do a full security review before deploying
 */

// ── Authoritative constant — never changes at runtime ────────────────────────

export const EXECUTION_MODE = "paper" as const;
export type ExecutionMode = typeof EXECUTION_MODE;

export const PAPER_TRADING_ONLY = true;
export const LIVE_TRADING_ENABLED = false;

// ── Startup safety guard ──────────────────────────────────────────────────────

/**
 * Call once at app startup. Throws immediately if someone has attempted to
 * enable live trading via environment variables.
 */
export function assertPaperModeOnly(): void {
  const liveAttempt =
    process.env.EXECUTION_MODE === "live" ||
    process.env.ALLOW_LIVE_TRADING === "true" ||
    process.env.LIVE_TRADING === "true" ||
    process.env.LIVE_ORDER_ENABLED === "true" ||
    process.env.BINANCE_EXECUTION_MODE === "live";

  if (liveAttempt) {
    throw new Error(
      "LIVE_TRADING_DISABLED: This build is locked to paper mode only. " +
      "Live trading is not supported. Remove live-mode env vars and restart.",
    );
  }

  // Warn if real API keys are set (they are ignored but shouldn't be here)
  if (process.env.BINANCE_API_KEY || process.env.BINANCE_SECRET_KEY) {
    console.warn(
      "[PaperMode] ⚠ WARNING: Real exchange API keys detected in environment. " +
      "These are IGNORED in paper mode but should be removed for security.",
    );
  }
}

/**
 * Hard-throw for any code path that would submit a live order.
 * Insert at the top of any function that must never run in paper mode.
 */
export function blockLiveExecution(context: string): never {
  throw new Error(
    `LIVE_TRADING_DISABLED: '${context}' is blocked — app is locked to paper mode only.`,
  );
}

// ── Status payload for API/UI ─────────────────────────────────────────────────

export function getPaperModeStatus() {
  return {
    executionMode:      EXECUTION_MODE,
    paperTradingOnly:   PAPER_TRADING_ONLY,
    liveTradingEnabled: LIVE_TRADING_ENABLED,
    message:            "PAPER MODE ONLY — live trading permanently disabled in this build",
  } as const;
}
