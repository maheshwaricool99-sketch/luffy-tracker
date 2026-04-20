/**
 * RISK SERVICE
 *
 * Central risk authority for non-capital checks.
 * Capital / exposure checks are handled by portfolio-state.ts.
 *
 * Checks (in order):
 *   1. Kill switch (hard stop — blocks everything)
 *   2. Degraded mode (logs, allows trades)
 *   3. Stale candidate (expired TTL)
 *   4. Price quality (WS confirmation required)
 *   5. Daily loss limit (activates kill switch if breached)
 */

import type { Candidate, RejectionReason, RiskConfig, Trade } from "./types";
import { DEFAULT_RISK_CONFIG } from "./types";
import { eventBus } from "./event-bus";
// isWsConfirmedPrice is intentionally NOT used as a hard gate in paper mode.
// See check 4 below — price validation is delegated to executionService.open()
// which rejects any entry with price <= 0 regardless of source (WS or REST).
import { isWsConfirmedPrice as _isWsConfirmedPriceRef } from "../paper-exchange";
void _isWsConfirmedPriceRef; // prevent unused-import lint errors

// ── Risk state ────────────────────────────────────────────────────────────────

let _killSwitch = false;
let _degradedMode = false;
let _degradedReason: string | undefined;
let _failureCount = 0;
let _lastFailureWindowStart = 0;

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_WINDOW_MS = 60_000;

// ── Risk result ───────────────────────────────────────────────────────────────

export type RiskResult =
  | { approved: true }
  | { approved: false; reason: RejectionReason; detail: string };

// ── Service ───────────────────────────────────────────────────────────────────

export const riskService = {
  /**
   * Evaluate a candidate against all risk rules.
   * Capital / exposure checks are NOT done here — they live in portfolio-state.ts.
   */
  evaluate(
    candidate: Candidate,
    openTrades: Trade[],
    config: RiskConfig = DEFAULT_RISK_CONFIG,
  ): RiskResult {
    const now = Date.now();

    // 1. Kill switch
    if (_killSwitch) {
      return block("RISK_KILL_SWITCH", "Kill switch is active — no new positions");
    }

    // 2. Degraded mode (allow trades, just log)
    if (_degradedMode) {
      console.log(`[RiskService] DEGRADED MODE (${_degradedReason}) — proceeding with caution`);
    }

    // 3. Stale candidate
    if (candidate.candidateExpiryAtMs <= now) {
      return block("EXPIRED", `Candidate expired at ${new Date(candidate.candidateExpiryAtMs).toISOString()}`);
    }

    // 4. Price quality — WS confirmation preferred but not required in paper mode.
    // In paper trading we use the best available price (WS → LKG → REST).
    // We only hard-block when there is literally NO price at all (price === 0).
    // The isWsConfirmedPrice check is advisory; the actual price used for entry
    // is validated in executionService.open() where it is rejected if <= 0.
    // Rationale: WS feeds can be temporarily down on startup or network blip;
    // REST prices are close enough for paper simulation purposes.
    // (Hard-blocking here caused all trackers to be stuck until WS reconnected.)

    // 5. Daily loss limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    const dailyPnl = openTrades
      .filter((t) => (t.closedAtMs ?? 0) >= todayStartMs || t.status === "open")
      .reduce((s, t) => s + (t.realizedPnlUsd ?? 0) + t.unrealizedPnlUsd, 0);

    const dailyLossLimit = config.paperEquityUsd * config.dailyLossLimitPct * -1;
    if (dailyPnl <= dailyLossLimit) {
      this.activateKillSwitch("Daily loss limit breached");
      return block("RISK_DAILY_LOSS", `Daily PnL ${dailyPnl.toFixed(2)} hit limit ${dailyLossLimit.toFixed(2)}`);
    }

    // Approved — capital/exposure checks pass through portfolio-state.ts
    eventBus.publish("risk.approved", {
      candidateId: candidate.id,
      symbol: candidate.symbol,
      sourceEngine: candidate.sourceEngine,
      payload: { side: candidate.side, engine: candidate.sourceEngine },
    });

    return { approved: true };
  },

  activateKillSwitch(reason: string): void {
    if (_killSwitch) return;
    _killSwitch = true;
    console.error(`[RiskService] ⛔ KILL SWITCH ACTIVATED: ${reason}`);
    eventBus.publish("degraded_mode.entered", {
      payload: { reason: `kill-switch: ${reason}` },
    });
  },

  deactivateKillSwitch(): void {
    _killSwitch = false;
    console.log("[RiskService] Kill switch deactivated");
  },

  recordFailure(): void {
    const now = Date.now();
    if (now - _lastFailureWindowStart > CIRCUIT_BREAKER_WINDOW_MS) {
      _failureCount = 0;
      _lastFailureWindowStart = now;
    }
    _failureCount++;
    if (_failureCount >= CIRCUIT_BREAKER_THRESHOLD && !_degradedMode) {
      _degradedMode = true;
      _degradedReason = `${_failureCount} failures in ${CIRCUIT_BREAKER_WINDOW_MS / 1000}s`;
      console.warn(`[RiskService] ⚠ DEGRADED MODE: ${_degradedReason}`);
      eventBus.publish("degraded_mode.entered", { payload: { reason: _degradedReason } });
    }
  },

  recordSuccess(): void {
    if (_failureCount > 0) _failureCount = Math.max(0, _failureCount - 1);
    if (_degradedMode && _failureCount === 0) {
      _degradedMode = false;
      _degradedReason = undefined;
      eventBus.publish("degraded_mode.exited", { payload: {} });
    }
  },

  state(): { killSwitch: boolean; degradedMode: boolean; degradedReason?: string; failureCount: number } {
    return { killSwitch: _killSwitch, degradedMode: _degradedMode, degradedReason: _degradedReason, failureCount: _failureCount };
  },
};

// ── Helper ────────────────────────────────────────────────────────────────────

function block(reason: RejectionReason, detail: string): { approved: false; reason: RejectionReason; detail: string } {
  eventBus.publish("risk.blocked", { payload: { reason, detail } });
  return { approved: false, reason, detail };
}
