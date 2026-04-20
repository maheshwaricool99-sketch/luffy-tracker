/**
 * EXEC LOGGER — Centralized structured execution logging for all trackers.
 *
 * All log lines are structured JSON emitted to stdout via console.log.
 * Parseable by log aggregators (Datadog, Loki, etc.) and grep-friendly.
 *
 * Reason codes:
 *   PAPER_ORDER_SUBMITTED   — order dispatched to paper exchange
 *   TRADE_STORED            — trade written to tradeStore
 *   TRADE_CLOSED            — trade closed, slot freed
 *   REPLACEMENT_OPENED      — replacement trade opened after close
 *   EXECUTION_SUCCEEDED     — full pipeline succeeded
 *   PORTFOLIO_REJECTED      — rejected at portfolio-state gate
 *   CLAIM_REJECTED          — rejected at claim-registry gate
 *   RISK_REJECTED           — rejected at risk-service gate
 *   EXECUTION_FAILED        — rejected at execution-service
 *   WS_CONFIRMATION_BLOCKED — no WS price; REST-only fallback or skip
 *   ENGINE_CAP_BLOCKED      — engine at capacity ($500 or 5 slots)
 *   EXPOSURE_CAP_BLOCKED    — global exposure cap hit
 *   DUPLICATE_SYMBOL_BLOCKED— symbol already open in portfolio
 *   COOLDOWN_BLOCKED        — symbol in cooldown after recent close
 */

export type ExecReasonCode =
  | "PAPER_ORDER_SUBMITTED"
  | "TRADE_STORED"
  | "TRADE_CLOSED"
  | "REPLACEMENT_OPENED"
  | "EXECUTION_SUCCEEDED"
  | "PORTFOLIO_REJECTED"
  | "CLAIM_REJECTED"
  | "RISK_REJECTED"
  | "EXECUTION_FAILED"
  | "WS_CONFIRMATION_BLOCKED"
  | "ENGINE_CAP_BLOCKED"
  | "EXPOSURE_CAP_BLOCKED"
  | "DUPLICATE_SYMBOL_BLOCKED"
  | "COOLDOWN_BLOCKED";

export type ExecLogEntry = {
  reasonCode: ExecReasonCode;
  tracker: string;
  symbol: string;
  side?: "LONG" | "SHORT";
  message: string;
  timestamp: string;
  // Optional numeric context
  openPairs?: number;
  capacity?: number;
  confidence?: number;
  netEdgeR?: number;
  priceSource?: string;
  price?: number;
  notionalUsd?: number;
  tradeId?: string;
  detail?: string;
};

/**
 * Emit a structured execution log line.
 * All fields are flat so log parsers don't need nested access.
 */
export function execLog(entry: ExecLogEntry): void {
  const line = JSON.stringify({
    level: "INFO",
    module: "exec-logger",
    ts: Date.now(),
    ...entry,
  });
  console.log(line);
}

/**
 * Convenience: log a blocked/rejected event.
 */
export function execBlock(
  reasonCode: ExecReasonCode,
  tracker: string,
  symbol: string,
  message: string,
  extras?: Partial<Omit<ExecLogEntry, "reasonCode" | "tracker" | "symbol" | "message">>,
): void {
  execLog({
    reasonCode,
    tracker,
    symbol,
    message,
    timestamp: new Date().toISOString(),
    ...extras,
  });
}

/**
 * Convenience: log a successful execution event.
 */
export function execSuccess(
  reasonCode: ExecReasonCode,
  tracker: string,
  symbol: string,
  side: "LONG" | "SHORT",
  message: string,
  extras?: Partial<Omit<ExecLogEntry, "reasonCode" | "tracker" | "symbol" | "side" | "message">>,
): void {
  execLog({
    reasonCode,
    tracker,
    symbol,
    side,
    message,
    timestamp: new Date().toISOString(),
    ...extras,
  });
}
