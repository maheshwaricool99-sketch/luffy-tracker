/**
 * PORTFOLIO CONTROLLER
 *
 * Central orchestrator. Every engine submits Candidates here.
 * This is the ONLY path to trade execution.
 *
 * Submit pipeline:
 *   1. rankCandidate()                     — compute finalRankScore
 *   2. portfolioState.validateTradeRequest — capital/exposure/duplicate gate
 *   3. claimRegistry.attempt()             — atomic dedup + cooldown
 *   4. riskService.evaluate()              — kill switch, WS price, daily loss
 *   5. executionService.open()             — size clamped, paper order, register
 *
 * Monitor loop:
 *   Every 5s checks open trades for stop/target/expiry.
 *   Uses portfolioState (single source of truth for open exposure).
 */

import type { Candidate, RiskConfig, Trade } from "./types";
import { DEFAULT_RISK_CONFIG, candidateExpiryMs } from "./types";
import { assertPaperModeOnly, getPaperModeStatus } from "../paper-mode";
import { rankCandidate } from "./ranking";
import { claimRegistry } from "./claim-registry";
import { riskService } from "./risk-service";
import { executionService } from "./execution-service";
import { tradeStore } from "./trade-store";
import { eventBus } from "./event-bus";
import { getPriceSync } from "../paper-exchange";
import {
  engineIdToName,
  isSymbolAlreadyOpen,
  computeAllowedSizeUsd,
  computeEngineCapacity,
  getPortfolioRiskDiagnostics,
  recalculateStateFromOpenTrades,
  MIN_TRADE_SIZE_USD,
  MAX_OPEN_PER_ENGINE,
  ENGINE_CAP_USD,
} from "../portfolio-state";
import { rebuildFromOpenTrades, sweepPending } from "./global-trade-registry";

// ── Config ────────────────────────────────────────────────────────────────────

const MAX_TRADE_DURATION_MS = 3 * 60 * 60_000; // 3h hard expiry
const MONITOR_INTERVAL_MS   = 5_000;            // price check every 5s

// ── State ─────────────────────────────────────────────────────────────────────

let _config: RiskConfig = { ...DEFAULT_RISK_CONFIG };
let _monitorTimer: NodeJS.Timeout | null = null;
let _started = false;
let _totalSubmitted = 0;
let _totalApproved  = 0;
let _totalRejected  = 0;

// ── Submission result ─────────────────────────────────────────────────────────

export type SubmitResult =
  | { accepted: true;  trade: Trade }
  | { accepted: false; stage: "portfolio" | "claim" | "risk" | "execution"; reason: string; detail: string };

// ── Controller ────────────────────────────────────────────────────────────────

export const portfolioController = {
  configure(config: Partial<RiskConfig>): void {
    _config = { ..._config, ...config };
  },

  getConfig(): RiskConfig {
    return { ..._config };
  },

  /**
   * Submit a candidate for evaluation and (if approved) execution.
   *
   * Full pipeline:
   *   rank → portfolioState validate → claim → risk → execute
   */
  submit(candidate: Candidate): SubmitResult {
    _totalSubmitted++;
    const engineName = engineIdToName(candidate.sourceEngine);

    eventBus.publish("candidate.created", {
      candidateId: candidate.id,
      symbol: candidate.symbol,
      sourceEngine: candidate.sourceEngine,
      payload: { setupType: candidate.setupType, side: candidate.side, confidence: candidate.confidence },
    });

    // 1. Rank
    rankCandidate(candidate);

    // 2. Portfolio-state gate: capacity, open count, duplicate symbol
    const cap          = computeEngineCapacity(engineName);
    const allowedSizeUsd = computeAllowedSizeUsd(engineName);

    if (isSymbolAlreadyOpen(candidate.symbol)) {
      _totalRejected++;
      const detail = `${candidate.symbol} is already open portfolio-wide`;
      _publishRejected(candidate, "portfolio", "DUPLICATE_SYMBOL", detail);
      return { accepted: false, stage: "portfolio", reason: "DUPLICATE_SYMBOL", detail };
    }

    // Per-engine concurrent trade limit (default 5)
    if (cap.validOpenTradesCount >= MAX_OPEN_PER_ENGINE) {
      _totalRejected++;
      const detail =
        `[portfolio] ENGINE_TRADE_LIMIT — ${engineName} already has ${cap.validOpenTradesCount}/${MAX_OPEN_PER_ENGINE} trades open`;
      _publishRejected(candidate, "portfolio", "ENGINE_CAP" as never, detail);
      return { accepted: false, stage: "portfolio", reason: "ENGINE_CAP_EXCEEDED", detail };
    }

    if (allowedSizeUsd < MIN_TRADE_SIZE_USD) {
      _totalRejected++;
      const reason = cap.remainingCapacity < MIN_TRADE_SIZE_USD
        ? "ENGINE_CAP_EXCEEDED"
        : "GLOBAL_EXPOSURE_CAP";
      const detail =
        `[portfolio] ${reason} — ${engineName} has $${cap.remainingCapacity.toFixed(2)} remaining ` +
        `(usedCapital=$${cap.usedCapital} openTrades=${cap.validOpenTradesCount})`;
      console.log(
        `[cap.reject] engine=${engineName} symbol=${candidate.symbol} ` +
        `usedCapital=$${cap.usedCapital} remainingCapacity=$${cap.remainingCapacity} ` +
        `openTrades=${cap.validOpenTradesCount} reason=${reason}`,
      );
      _publishRejected(candidate, "portfolio", reason as never, detail);
      return { accepted: false, stage: "portfolio", reason, detail };
    }

    // 3. Claim — atomic dedup + cooldown
    const claimResult = claimRegistry.attempt(candidate, _config.claimCooldownMs);
    if (!claimResult.granted) {
      _totalRejected++;
      _publishRejected(candidate, "claim", claimResult.reason, claimResult.detail);
      return { accepted: false, stage: "claim", reason: claimResult.reason, detail: claimResult.detail };
    }

    // 4. Risk — kill switch, WS price, daily loss
    const openTrades = tradeStore.allOpen();
    const riskResult = riskService.evaluate(candidate, openTrades, _config);
    if (!riskResult.approved) {
      claimRegistry.release(claimResult.claim.id, riskResult.reason);
      _totalRejected++;
      _publishRejected(candidate, "risk", riskResult.reason, riskResult.detail);
      return { accepted: false, stage: "risk", reason: riskResult.reason, detail: riskResult.detail };
    }

    // 5. Execute — sizing is clamped inside executionService to allowedSizeUsd
    const execResult = executionService.open(candidate, claimResult.claim.id, _config);
    if (!execResult.ok) {
      _totalRejected++;
      return { accepted: false, stage: "execution", reason: "EXECUTION_FAILED", detail: execResult.reason };
    }

    _totalApproved++;
    return { accepted: true, trade: execResult.trade };
  },

  start(): void {
    if (_started) return;
    _started = true;

    // Safety: assert paper-only mode before doing anything
    assertPaperModeOnly();

    // Step 1: Clear stale claim cooldowns and pending claims from previous session.
    // Old cooldowns block re-entries even though no trades are open.
    claimRegistry.resetForStartup();

    // Step 2: HARD RESET — close ALL open trades from previous session.
    // Paper trading: every server start is a clean slate. No trade state
    // carries over across restarts. This eliminates the $0-capacity-after-restart bug.
    const prevTrades = tradeStore.allOpen();
    if (prevTrades.length > 0) {
      console.log(`[PortfolioController] Hard reset: closing ${prevTrades.length} previous-session trade(s)`);
      for (const trade of prevTrades) {
        const closePrice = trade.currentPrice > 0 ? trade.currentPrice : trade.entryPrice;
        try {
          executionService.close(trade.id, {
            closeReason: "RECONCILIATION",
            closeDetail: "Hard reset — server restarted",
            closePrice,
          });
        } catch { /* never fail startup */ }
      }
    }

    // Step 3: Rebuild portfolio-state from zero (all trades now closed).
    recalculateStateFromOpenTrades();

    // Step 4: Sync global trade registry (should be empty after hard reset).
    rebuildFromOpenTrades(tradeStore.allOpen());

    // Step 5: Log per-engine capacity at startup
    const ALL_ENGINES = ["luffy", "luffy-lite", "tracker-advanced", "tracker-expert", "tracker-ace"] as const;
    for (const eng of ALL_ENGINES) {
      const cap = computeEngineCapacity(eng as import("../portfolio-state").EngineName);
      console.log(
        `[cap.init] engine=${eng} ` +
        `openTradesRaw=${cap.openTradeCount} validOpenTrades=${cap.validOpenTradesCount} ` +
        `usedCapital=$${cap.usedCapital} remainingCapacity=$${cap.remainingCapacity} ` +
        `maxCapital=$${cap.maxCapital}`,
      );
    }

    _scheduleMonitor();
    const mode = getPaperModeStatus();
    console.log(`[PortfolioController] Started — ${mode.message}`);
  },

  stop(): void {
    _started = false;
    if (_monitorTimer) { clearTimeout(_monitorTimer); _monitorTimer = null; }
  },

  snapshot() {
    const rs   = riskService.state();
    const ts   = tradeStore.stats();
    const diag = getPortfolioRiskDiagnostics();
    return {
      snapshotAtMs: Date.now(),
      ...getPaperModeStatus(),
      killSwitchActive: rs.killSwitch,
      degradedMode: rs.degradedMode,
      degradedReason: rs.degradedReason,
      openTrades: tradeStore.allOpen(),
      recentClosed: tradeStore.recentClosed(50),
      equity: ts.equity,
      dailyPnl: ts.dailyPnl,
      unrealizedPnl: ts.unrealizedPnl,
      realizedPnl: ts.realizedPnl,
      openCount: ts.openCount,
      closedCount: ts.closedCount,
      pendingClaims: claimRegistry.pendingCount(),
      stats: { submitted: _totalSubmitted, approved: _totalApproved, rejected: _totalRejected },
      config: _config,
      portfolioRisk: diag,
    };
  },

  activateKillSwitch(reason: string): void { riskService.activateKillSwitch(reason); },
  deactivateKillSwitch(): void             { riskService.deactivateKillSwitch(); },

  forceClose(tradeId: string, reason = "Manual close"): boolean {
    return executionService.close(tradeId, { closeReason: "MANUAL", closeDetail: reason }).ok;
  },

  forceRecalculate(): void {
    recalculateStateFromOpenTrades();
  },
};

// ── Monitor loop ──────────────────────────────────────────────────────────────

function _scheduleMonitor(): void {
  if (!_started) return;
  _monitorTimer = setTimeout(() => {
    _monitorTimer = null;
    _runMonitorCycle();
    _scheduleMonitor();
  }, MONITOR_INTERVAL_MS);
}

function _runMonitorCycle(): void {
  const now = Date.now();
  // Sweep stale global-registry pending claims on every cycle
  sweepPending();
  for (const trade of tradeStore.allOpen()) {
    try { _checkTrade(trade, now); } catch { /* never crash monitor */ }
  }
}

function _checkTrade(trade: Trade, now: number): void {
  const price = getPriceSync(trade.symbol);
  if (!price || price <= 0) return;

  tradeStore.updatePrice(trade.id, price);

  if (now - trade.openedAtMs >= MAX_TRADE_DURATION_MS) {
    executionService.close(trade.id, {
      closeReason: "EXPIRED",
      closeDetail: `Exceeded ${MAX_TRADE_DURATION_MS / 3600_000}h max duration`,
      closePrice: price,
    });
    return;
  }

  const isLong = trade.side === "LONG";
  if (isLong ? price <= trade.stopPrice : price >= trade.stopPrice) {
    executionService.close(trade.id, { closeReason: "STOP_HIT", closeDetail: `Stop ${trade.stopPrice} hit at ${price}`, closePrice: trade.stopPrice });
    return;
  }
  if (isLong ? price >= trade.targetPrice : price <= trade.targetPrice) {
    executionService.close(trade.id, { closeReason: "TARGET_HIT", closeDetail: `Target ${trade.targetPrice} hit at ${price}`, closePrice: trade.targetPrice });
  }
}

// ── Private helpers ───────────────────────────────────────────────────────────

function _publishRejected(candidate: Candidate, stage: string, reason: string, detail: string): void {
  eventBus.publish("candidate.rejected", {
    candidateId: candidate.id,
    symbol: candidate.symbol,
    sourceEngine: candidate.sourceEngine,
    payload: { stage, reason, detail },
  });
}

// ── buildCandidate helper (used by engines) ───────────────────────────────────

export function buildCandidate(params: {
  sourceEngine: import("./types").EngineId;
  strategyId: string;
  symbol: string;
  side: "LONG" | "SHORT";
  setupType: string;
  timeframe: string;
  entryLow: number;
  entryHigh: number;
  entryMid: number;
  stopPlan: number;
  targetPlan: number;
  confidence: number;
  netEdgeR: number;
  strategyScore: number;
  reasonTags?: string[];
}): Candidate {
  const now = Date.now();
  return {
    id: `cnd-${now}-${Math.random().toString(36).slice(2, 7)}`,
    sourceEngine: params.sourceEngine,
    strategyId: params.strategyId,
    symbol: params.symbol,
    side: params.side,
    setupType: params.setupType,
    timeframe: params.timeframe,
    entryPlan: { low: params.entryLow, high: params.entryHigh, mid: params.entryMid },
    stopPlan: params.stopPlan,
    targetPlan: params.targetPlan,
    confidence: params.confidence,
    netEdgeR: params.netEdgeR,
    strategyScore: params.strategyScore,
    candidateCreatedAtMs: now,
    candidateExpiryAtMs: now + candidateExpiryMs(params.timeframe),
    reasonTags: params.reasonTags ?? [],
  };
}
