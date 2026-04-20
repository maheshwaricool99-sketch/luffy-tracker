/**
 * EXECUTION SERVICE
 *
 * The ONLY component permitted to open or close trades.
 * All order flow goes through here — no engine may call tradeStore directly.
 *
 * Responsibilities:
 *   1. Validate capacity via portfolioState (engine cap + global cap)
 *   2. Size position: risk-model qty, clamped to allowed notional
 *   3. Open trade in tradeStore
 *   4. Register trade in portfolioState (single source of truth)
 *   5. Mark claim as filled
 *   6. Emit order lifecycle events
 *   7. Report failures back to riskService circuit breaker
 *
 * On close: deregisters from portfolioState first, then updates tradeStore.
 */

import type { Candidate, Trade, CloseReason, RiskConfig } from "./types";
import { DEFAULT_RISK_CONFIG } from "./types";
import { tradeStore } from "./trade-store";
import { claimRegistry } from "./claim-registry";
import { riskService } from "./risk-service";
import { eventBus } from "./event-bus";
import { getPriceSync } from "../paper-exchange";
import {
  engineIdToName,
  computeAllowedSizeUsd,
  registerOpenTrade,
  closeOpenTrade,
  MIN_TRADE_SIZE_USD,
  MAX_NOTIONAL_PER_TRADE_USD,
} from "../portfolio-state";
import {
  makeTradeKey,
  tryClaim   as gtryClaim,
  confirmClaim,
  releaseClaim,
  closeTrade  as gCloseTrade,
} from "./global-trade-registry";

// ── Sizing constants ──────────────────────────────────────────────────────────

const FEE_RATE = 0.0006; // 0.06% taker fee (paper)
const LEVERAGE  = 5;      // 5x for margin calc

// ── Position sizing (capped) ──────────────────────────────────────────────────

type SizingResult = {
  quantity: number;
  notionalUsd: number;
  marginUsd: number;
  entryFeeUsd: number;
};

/**
 * Compute position size.
 * Ideal qty = riskUsd / stopDistance.
 * Ideal notional is THEN CLAMPED to allowedNotionalUsd so no engine
 * can ever create a position larger than its remaining cap.
 */
function computeSizing(
  entryPrice: number,
  stopPrice: number,
  allowedNotionalUsd: number,
  config: RiskConfig,
): SizingResult | null {
  if (entryPrice <= 0 || stopPrice <= 0) return null;

  const stopDistance = Math.abs(entryPrice - stopPrice);
  if (stopDistance <= 0) return null;

  // Risk-model ideal size
  const riskUsd     = config.paperEquityUsd * config.maxRiskPerTradePct; // e.g. $200
  const idealQty    = riskUsd / stopDistance;
  const idealNotional = idealQty * entryPrice;

  // Clamp to the engine/global remaining capacity
  const finalNotional = Math.min(idealNotional, allowedNotionalUsd);
  const finalQty      = finalNotional / entryPrice;

  if (finalQty <= 0 || finalNotional < MIN_TRADE_SIZE_USD) return null;

  const marginUsd   = finalNotional / LEVERAGE;
  const entryFeeUsd = finalNotional * FEE_RATE;

  console.log(
    `[ExecutionService] sizing ${stopDistance > 0 ? "ok" : "bad"} | ` +
    `idealNotional=$${idealNotional.toFixed(2)} → clamped=$${finalNotional.toFixed(2)} ` +
    `(allowed=$${allowedNotionalUsd.toFixed(2)}) qty=${finalQty.toFixed(4)}`
  );

  return { quantity: finalQty, notionalUsd: finalNotional, marginUsd, entryFeeUsd };
}

// ── Execution result ──────────────────────────────────────────────────────────

export type ExecutionResult =
  | { ok: true;  trade: Trade }
  | { ok: false; reason: string };

// ── Service ───────────────────────────────────────────────────────────────────

export const executionService = {
  /**
   * Open a paper trade for an approved, claimed candidate.
   * claimId must already be granted by claimRegistry.
   */
  open(
    candidate: Candidate,
    claimId: string,
    config: RiskConfig = DEFAULT_RISK_CONFIG,
  ): ExecutionResult {
    const engineName = engineIdToName(candidate.sourceEngine);

    // 0. Global trade registry — fast in-memory dedup (belt-and-suspenders)
    const tradeKey = makeTradeKey(candidate.symbol, candidate.side);
    const globalClaim = gtryClaim(tradeKey, engineName);
    if (!globalClaim.ok) {
      claimRegistry.release(claimId, "DUPLICATE_SYMBOL");
      eventBus.publish("order.failed", {
        candidateId: candidate.id,
        symbol: candidate.symbol,
        sourceEngine: candidate.sourceEngine,
        claimId,
        payload: { reason: "GLOBAL_DUPLICATE", detail: globalClaim.reason, engine: engineName },
      });
      return { ok: false, reason: `GlobalRegistry: ${globalClaim.reason} for ${candidate.symbol}:${candidate.side}` };
    }

    // 1. Get live execution price
    let livePrice = getPriceSync(candidate.symbol);
    if (!livePrice || livePrice <= 0) {
      claimRegistry.release(claimId, "STALE_PRICE");
      releaseClaim(tradeKey);
      // Do NOT call recordFailure() here — a missing price means the symbol is
      // unavailable/delisted on this feed, which is a data-quality skip, not an
      // execution failure. Counting it trips DEGRADED MODE when STATIC_SYMBOLS
      // contains delisted pairs and we iterate through many of them.
      livePrice = getPriceSync(candidate.symbol) || candidate.entryPlan.mid;
    }

    // 2. Sanity: live price within 5% of candidate's plan midpoint.
    // Trackers normalize entryMid → live mark before submitting, so divergence
    // above 5% means the signal was generated against a stale/mock price and
    // the entry level is no longer valid. Not a circuit-breaker-worthy failure.
    const planMid = candidate.entryPlan.mid;
    if (planMid > 0) {
      const slippage = Math.abs(livePrice - planMid) / planMid;
      if (slippage > 0.05) {
        claimRegistry.release(claimId, "STALE_PRICE");
        releaseClaim(tradeKey);
        return { ok: false, reason: `Price slipped ${(slippage * 100).toFixed(2)}% from plan mid (${planMid} → ${livePrice})` };
      }
    }

    // 3. Determine allowed notional from portfolio caps (engine + global)
    const allowedNotionalUsd = computeAllowedSizeUsd(engineName);
    if (allowedNotionalUsd < MIN_TRADE_SIZE_USD) {
      claimRegistry.release(claimId, "INVALID_CANDIDATE");
      releaseClaim(tradeKey);
      console.log(
        `[cap.reject] engine=${engineName} symbol=${candidate.symbol} ` +
        `allowedNotional=$${allowedNotionalUsd.toFixed(2)} reason=ENGINE_CAP_EXCEEDED`,
      );
      return { ok: false, reason: `RISK_ENGINE_CAP: ${engineName} has no remaining capacity ($${allowedNotionalUsd.toFixed(2)} < min $${MIN_TRADE_SIZE_USD})` };
    }

    // Per-trade hard cap: max $100 per trade (5 trades × $100 = $500 engine cap).
    // This ensures no single trade can consume the whole engine budget.
    const perTradeCap = Math.min(allowedNotionalUsd, MAX_NOTIONAL_PER_TRADE_USD);

    // 4. Compute sizing (clamped to per-trade cap)
    const sizing = computeSizing(livePrice, candidate.stopPlan, perTradeCap, config);
    if (!sizing) {
      claimRegistry.release(claimId, "INVALID_CANDIDATE");
      releaseClaim(tradeKey);
      return { ok: false, reason: `Invalid sizing for ${candidate.symbol} entry=${livePrice} stop=${candidate.stopPlan}` };
    }

    // 5. Emit order.submitted
    eventBus.publish("order.submitted", {
      candidateId: candidate.id,
      symbol: candidate.symbol,
      sourceEngine: candidate.sourceEngine,
      claimId,
      payload: {
        side: candidate.side,
        entryPrice: livePrice,
        quantity: sizing.quantity,
        notionalUsd: sizing.notionalUsd,
        engine: engineName,
      },
    });

    // 6. Open trade record in tradeStore
    let trade: Trade; // eslint-disable-next-line prefer-const
    try {
      trade = tradeStore.open({
        claimId,
        candidateId: candidate.id,
        sourceEngine: candidate.sourceEngine,
        symbol: candidate.symbol,
        side: candidate.side,
        setupType: candidate.setupType,
        timeframe: candidate.timeframe,
        entryPrice: livePrice,
        stopPrice: candidate.stopPlan,
        targetPrice: candidate.targetPlan,
        quantity: sizing.quantity,
        notionalUsd: sizing.notionalUsd,
        marginUsd: sizing.marginUsd,
        entryFeeUsd: sizing.entryFeeUsd,
        signalEntry: candidate.reasonTags?.join(", "),
        note: `rank=${candidate.finalRankScore?.toFixed(1) ?? "?"} conf=${candidate.confidence} engine=${engineName}`,
      });
    } catch (err) {
      claimRegistry.release(claimId, "ERROR" as never);
      releaseClaim(tradeKey);
      riskService.recordFailure();
      return { ok: false, reason: `tradeStore.open failed: ${String(err)}` };
    }

    // 7. Register in portfolioState (single source of truth for exposure)
    registerOpenTrade({
      id: trade.id,
      symbol: trade.symbol,
      engine: engineName,
      sizeUsd: trade.notionalUsd,
      qty: trade.quantity,
      entryPrice: trade.entryPrice,
      side: trade.side,
      openedAt: trade.openedAtMs,
    });

    // 8. Promote claim → filled; promote global registry pending → active
    claimRegistry.markFilled(claimId, trade.id);
    confirmClaim(tradeKey);
    riskService.recordSuccess();

    // 9. Emit order.filled
    eventBus.publish("order.filled", {
      tradeId: trade.id,
      claimId,
      candidateId: candidate.id,
      symbol: trade.symbol,
      sourceEngine: trade.sourceEngine,
      payload: {
        side: trade.side,
        entryPrice: trade.entryPrice,
        quantity: trade.quantity,
        notionalUsd: trade.notionalUsd,
        marginUsd: trade.marginUsd,
        engine: engineName,
      },
    });

    console.log(
      `[ExecutionService] ✓ OPENED ${trade.symbol} ${trade.side} ` +
      `entry=${trade.entryPrice} notional=$${trade.notionalUsd.toFixed(2)} ` +
      `engine=${engineName} tradeId=${trade.id}`
    );

    return { ok: true, trade };
  },

  /**
   * Close an open trade.
   * Deregisters from portfolioState immediately so capacity is freed.
   */
  close(
    tradeId: string,
    params: {
      closeReason: CloseReason;
      closeDetail?: string;
      closePrice?: number;
    },
  ): ExecutionResult {
    const openTrade = tradeStore.getOpen(tradeId);
    if (!openTrade) {
      return { ok: false, reason: `Trade ${tradeId} not found or already closed` };
    }

    // Deregister FIRST so capacity is immediately freed
    closeOpenTrade(tradeId);
    gCloseTrade(makeTradeKey(openTrade.symbol, openTrade.side));

    const closePrice = params.closePrice ?? (getPriceSync(openTrade.symbol) || openTrade.currentPrice);

    const closed = tradeStore.close(tradeId, {
      closePrice,
      closeReason: params.closeReason,
      closeDetail: params.closeDetail,
    });

    if (!closed) {
      return { ok: false, reason: `Failed to close trade ${tradeId}` };
    }

    // Record cooldown in claim registry
    claimRegistry.recordClose(closed.symbol);

    eventBus.publish("trade.closed", {
      tradeId: closed.id,
      symbol: closed.symbol,
      sourceEngine: closed.sourceEngine,
      payload: {
        closeReason: closed.closeReason,
        realizedPnlUsd: closed.realizedPnlUsd,
        rr: closed.rr,
        pnlPct: closed.pnlPct,
      },
    });

    console.log(
      `[ExecutionService] ✓ CLOSED ${closed.symbol} ${closed.side} ` +
      `reason=${closed.closeReason} pnl=$${(closed.realizedPnlUsd ?? 0).toFixed(2)} ` +
      `tradeId=${closed.id}`
    );

    return { ok: true, trade: closed };
  },
};
