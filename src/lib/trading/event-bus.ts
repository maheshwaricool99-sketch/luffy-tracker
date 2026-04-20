/**
 * TRADING EVENT BUS
 *
 * In-process EventEmitter with append-only JSONL persistence.
 * Interface is Redis/BullMQ-compatible — swap transport without changing callers.
 *
 * All trading state transitions MUST be emitted here for auditability
 * and deterministic replay.
 */

import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import type { TradingEvent, TradingEventType, EngineId } from "./types";
import { newId } from "./types";

// ── Log path ──────────────────────────────────────────────────────────────────

const RUNTIME_DIR = path.join(process.cwd(), ".runtime");
const EVENTS_DIR  = path.join(RUNTIME_DIR, "events");

function eventLogPath(ts = Date.now()): string {
  const d = new Date(ts);
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return path.join(EVENTS_DIR, `trade-events-${stamp}.jsonl`);
}

function appendEventLog(event: TradingEvent): void {
  try {
    if (!fs.existsSync(EVENTS_DIR)) fs.mkdirSync(EVENTS_DIR, { recursive: true });
    fs.appendFileSync(eventLogPath(event.ts), JSON.stringify(event) + "\n", "utf8");
  } catch {
    // Never crash engine on audit failure
  }
}

// ── Payload types ─────────────────────────────────────────────────────────────

export type EmitPayload = {
  sourceEngine?: EngineId;
  symbol?: string;
  tradeId?: string;
  claimId?: string;
  candidateId?: string;
  payload?: Record<string, unknown>;
};

// ── Bus implementation ────────────────────────────────────────────────────────

class TradingEventBusImpl extends EventEmitter {
  private _totalEmitted = 0;
  private _countByType: Record<string, number> = {};

  publish(type: TradingEventType, opts: EmitPayload = {}): TradingEvent {
    const event: TradingEvent = {
      id: newId("evt"),
      type,
      ts: Date.now(),
      sourceEngine: opts.sourceEngine,
      symbol: opts.symbol,
      tradeId: opts.tradeId,
      claimId: opts.claimId,
      candidateId: opts.candidateId,
      payload: opts.payload ?? {},
    };

    appendEventLog(event);

    this._totalEmitted++;
    this._countByType[type] = (this._countByType[type] ?? 0) + 1;

    // Emit to in-process listeners
    super.emit(type, event);
    super.emit("*", event); // wildcard subscription

    return event;
  }

  /** Subscribe to one event type. */
  on(type: TradingEventType | "*", listener: (e: TradingEvent) => void): this {
    return super.on(type, listener);
  }

  /** One-shot subscriber. */
  once(type: TradingEventType, listener: (e: TradingEvent) => void): this {
    return super.once(type, listener);
  }

  stats(): { total: number; byType: Record<string, number> } {
    return { total: this._totalEmitted, byType: { ...this._countByType } };
  }

  /** Read today's event log for replay/debugging. */
  readTodayEvents(): TradingEvent[] {
    try {
      const raw = fs.readFileSync(eventLogPath(), "utf8");
      return raw
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as TradingEvent);
    } catch {
      return [];
    }
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const eventBus = new TradingEventBusImpl();
export type { TradingEvent, TradingEventType };
