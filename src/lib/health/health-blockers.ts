import type { HealthSnapshot } from "@/lib/signals/signal-types";
import type { LuffySnapshot } from "@/lib/luffy-lite-engine";
import type { TradeBlocker, TradeBlockerSummary, IncidentSeverity } from "./health-types";
import { REASON_CODE_COPY } from "./health-mappers";

const MAX_TRADE_SLOTS = 7;

function makeBlocker(code: string, severity: IncidentSeverity = "info"): TradeBlocker | null {
  const copy = REASON_CODE_COPY[code];
  if (!copy) return null;
  return { code, title: copy.title, description: copy.description, severity };
}

export function buildTradeBlockers(
  health: HealthSnapshot,
  now: number,
  luffy?: LuffySnapshot | null,
): TradeBlockerSummary {
  const openPositions = luffy?.openPairs ?? 0;
  const remainingSlots = Math.max(0, MAX_TRADE_SLOTS - openPositions);
  const blockers: TradeBlocker[] = [];

  // Engine state blockers
  if (health.engine.status === "warming") {
    blockers.push({
      code: "SIGNAL_ENGINE_WARMING",
      title: "Signal Engine Initializing",
      description: "The signal engine is starting up. New signals will publish once the first full scan cycle completes.",
      severity: "info",
    });
  }

  if (health.engine.status === "restored") {
    blockers.push({
      code: "RESTORED_SNAPSHOT",
      title: "Running on Restored Snapshot",
      description: "The engine recovered from a previous state. Signal generation is active but based on prior data.",
      severity: "info",
    });
  }

  // Scanner warm-up
  const allScanners = health.scanner ?? [];
  const warmingUp = allScanners.some((s) => s.warmupPhase === "phase_1_core" || s.warmupPhase === "phase_2_priority");
  const avgCoverage = allScanners.length > 0
    ? allScanners.reduce((sum, s) => sum + s.coveragePct, 0) / allScanners.length
    : 100;

  if (warmingUp && avgCoverage < 50) {
    blockers.push({
      code: "SCANNER_WARMUP",
      title: "Scanner Warm-Up in Progress",
      description: `Coverage is at ${Math.round(avgCoverage)}%. Signal quality improves as more symbols are verified. The system is prioritizing higher-quality symbols first.`,
      severity: "info",
    });
  }

  // Macro filter blockers
  if (luffy?.macroContext) {
    const { macroContext } = luffy;
    if (!macroContext.allowNewTrades) {
      blockers.push({
        code: "MACRO_FILTER_BLOCKING",
        title: "Macro Conditions Filtering New Entries",
        description: `Current macro state (${macroContext.macroBias}, tension ${(macroContext.tensionIndex * 100).toFixed(0)}%) is suppressing new trade entries. The system is waiting for more favorable conditions.`,
        severity: "warning",
      });
    }

    if (macroContext.blockWeakSignals && macroContext.allowNewTrades) {
      blockers.push({
        code: "WEAK_SIGNAL_FILTER",
        title: "Weak Signal Filter Active",
        description: `Only signals above confidence ${macroContext.minConfidence.toFixed(0)}% are eligible. Lower-confidence setups are suppressed by macro conditions.`,
        severity: "info",
      });
    }
  }

  // Open position capacity
  if (openPositions >= MAX_TRADE_SLOTS) {
    blockers.push({
      code: "RISK_EXPOSURE_CAP",
      title: "Portfolio Risk Cap Reached",
      description: `All ${MAX_TRADE_SLOTS} active trade slots are filled. New entries are paused until existing positions close.`,
      severity: "warning",
    });
  }

  // Market data blockers
  const unavailableMarkets = health.sourceHealth.filter((m) => m.dataState === "unavailable");
  if (unavailableMarkets.length > 0) {
    blockers.push({
      code: "COVERAGE_INSUFFICIENT",
      title: "Market Data Insufficient",
      description: `${unavailableMarkets.map((m) => m.market.toUpperCase()).join(", ")} ${unavailableMarkets.length === 1 ? "has" : "have"} no usable data. Signals for affected markets are paused.`,
      severity: "critical",
    });
  }

  // Last error from engine
  if (luffy?.lastError && luffy.lastErrorAtMs && now - luffy.lastErrorAtMs < 600_000) {
    const errorAge = Math.round((now - luffy.lastErrorAtMs) / 1000);
    blockers.push({
      code: "ENGINE_ERROR",
      title: "Recent Engine Error",
      description: `The engine logged an error ${errorAge}s ago: "${luffy.lastError.slice(0, 120)}"`,
      severity: "info",
    });
  }

  // Healthy state — no valid setups
  if (blockers.length === 0 && health.engine.status === "ready" && openPositions < MAX_TRADE_SLOTS) {
    blockers.push({
      code: "NO_VALID_SETUPS",
      title: "No High-Confidence Setups Found",
      description: "The scanner ran successfully this cycle, but no symbols met the required quality thresholds. This is normal — not every cycle produces a signal.",
      severity: "info",
    });
  }

  let replacementState: string | undefined;
  if (luffy) {
    const eligible = luffy.eligiblePairs ?? 0;
    const open = luffy.openPairs ?? 0;
    if (eligible > 0 && open < MAX_TRADE_SLOTS) {
      replacementState = `${eligible} eligible candidate(s) — ${open} positions open`;
    }
  }

  return {
    activeTradeSlots: Math.min(openPositions, MAX_TRADE_SLOTS),
    maxTradeSlots: MAX_TRADE_SLOTS,
    remainingSlots,
    openPositions,
    replacementState,
    blockers,
  };
}
