/**
 * CLAIM REGISTRY
 *
 * Centralized, atomic claim management.
 * Prevents duplicate entries across all engines.
 *
 * Claim key: symbol + side
 * A claim blocks any other engine from entering the same symbol+side
 * until the trade closes or the claim expires.
 *
 * Conflict resolution (when two engines claim the same symbol simultaneously):
 *   1. finalRankScore   (higher wins)
 *   2. confidence       (higher wins)
 *   3. netEdgeR         (higher wins)
 *   4. engine priority  (luffy > luffy-lite > advanced > expert > ace)
 */

import fs from "node:fs";
import path from "node:path";
import type { Claim, ClaimStatus, RejectionReason, EngineId, Candidate } from "./types";
import { newId, ENGINE_PRIORITY } from "./types";
import { eventBus } from "./event-bus";

// ── Persistence ───────────────────────────────────────────────────────────────

const RUNTIME_DIR = path.join(process.cwd(), ".runtime");
const REGISTRY_PATH = path.join(RUNTIME_DIR, "claim-registry.json");

type RegistryState = {
  pending: Record<string, Claim>;    // claimId → Claim
  recent:  Record<string, Claim>;    // last N closed claims per symbol+side key
  cooldowns: Record<string, number>; // symbol → closedAtMs (for cooldown)
};

function loadRegistry(): RegistryState {
  try {
    if (fs.existsSync(REGISTRY_PATH)) {
      const raw = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8")) as Partial<RegistryState>;
      // Defensive: any missing or malformed field falls back to an empty object.
      // This prevents Object.entries(undefined) crashes when a file written by
      // an older script used a different schema (e.g. { "claims": {} }).
      return {
        pending:   raw.pending   && typeof raw.pending   === "object" ? raw.pending   : {},
        recent:    raw.recent    && typeof raw.recent    === "object" ? raw.recent    : {},
        cooldowns: raw.cooldowns && typeof raw.cooldowns === "object" ? raw.cooldowns : {},
      };
    }
  } catch { /* start fresh */ }
  return { pending: {}, recent: {}, cooldowns: {} };
}

const _registry: RegistryState = loadRegistry();
let _persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(): void {
  if (_persistTimer) return;
  _persistTimer = setTimeout(() => {
    _persistTimer = null;
    try {
      if (!fs.existsSync(RUNTIME_DIR)) fs.mkdirSync(RUNTIME_DIR, { recursive: true });
      const tmp = `${REGISTRY_PATH}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(_registry), "utf8");
      fs.renameSync(tmp, REGISTRY_PATH);
    } catch { /* never crash */ }
  }, 300);
}

function claimKey(symbol: string, side: string): string {
  return `${symbol}:${side}`;
}

// ── Expiry sweep ──────────────────────────────────────────────────────────────

function sweepExpired(): void {
  const now = Date.now();
  for (const [id, claim] of Object.entries(_registry.pending)) {
    if (claim.expiresAtMs <= now && claim.status === "pending") {
      claim.status = "expired";
      claim.rejectedAtMs = now;
      eventBus.publish("claim.rejected", {
        claimId: id,
        symbol: claim.symbol,
        sourceEngine: claim.sourceEngine,
        payload: { reason: "EXPIRED" },
      });
      delete _registry.pending[id];
    }
  }
}

// ── Registry API ──────────────────────────────────────────────────────────────

export const claimRegistry = {
  /**
   * Attempt to claim a symbol+side slot for a candidate.
   * Returns { granted: true, claim } or { granted: false, reason, detail }.
   */
  attempt(
    candidate: Candidate,
    cooldownMs: number,
    claimTtlMs = 60_000,
  ): { granted: true; claim: Claim } | { granted: false; reason: RejectionReason; detail: string } {
    sweepExpired();
    const now = Date.now();
    const key = claimKey(candidate.symbol, candidate.side);

    eventBus.publish("claim.attempted", {
      candidateId: candidate.id,
      symbol: candidate.symbol,
      sourceEngine: candidate.sourceEngine,
      payload: { side: candidate.side, engine: candidate.sourceEngine },
    });

    // 1. Check for existing open trade or pending claim on same key
    const existingPending = Object.values(_registry.pending).find(
      (c) => c.status === "pending" && claimKey(c.symbol, c.side) === key,
    );
    if (existingPending) {
      // Conflict resolution: compare scores
      const myScore = candidate.finalRankScore ?? candidate.strategyScore;
      const theirScore = (existingPending as Claim & { _score?: number })._score ?? 0;
      if (myScore <= theirScore) {
        return reject("PENDING_CLAIM_EXISTS", `${existingPending.sourceEngine} already holds claim on ${key}`);
      }
      // Override weaker claim
      existingPending.status = "rejected";
      existingPending.rejectionReason = "DUPLICATE_SYMBOL";
      existingPending.rejectedAtMs = now;
      eventBus.publish("claim.rejected", {
        claimId: existingPending.id,
        symbol: existingPending.symbol,
        sourceEngine: existingPending.sourceEngine,
        payload: { reason: "outranked", winner: candidate.sourceEngine },
      });
      delete _registry.pending[existingPending.id];
    }

    // 2. Check cooldown (same symbol, any side)
    const cooldownUntil = (_registry.cooldowns[candidate.symbol] ?? 0) + cooldownMs;
    if (now < cooldownUntil) {
      const secsLeft = Math.ceil((cooldownUntil - now) / 1000);
      return reject("COOLDOWN_ACTIVE", `${candidate.symbol} on cooldown for ${secsLeft}s more`);
    }

    // 3. Grant claim
    const claim: Claim & { _score?: number } = {
      id: newId("clm"),
      candidateId: candidate.id,
      symbol: candidate.symbol,
      side: candidate.side,
      sourceEngine: candidate.sourceEngine,
      status: "pending",
      createdAtMs: now,
      expiresAtMs: now + claimTtlMs,
      _score: candidate.finalRankScore ?? candidate.strategyScore,
    };

    _registry.pending[claim.id] = claim;
    schedulePersist();

    eventBus.publish("claim.granted", {
      claimId: claim.id,
      candidateId: candidate.id,
      symbol: candidate.symbol,
      sourceEngine: candidate.sourceEngine,
      payload: { side: candidate.side },
    });

    return { granted: true, claim };
  },

  /**
   * Promote a pending claim to "filled" once the order executes.
   */
  markFilled(claimId: string, tradeId: string): void {
    const claim = _registry.pending[claimId];
    if (!claim) return;
    claim.status = "filled";
    claim.filledAtMs = Date.now();
    claim.tradeId = tradeId;
    _registry.recent[claimKey(claim.symbol, claim.side)] = { ...claim };
    delete _registry.pending[claimId];
    schedulePersist();
  },

  /**
   * Release a claim (e.g. on order failure).
   */
  release(claimId: string, reason: RejectionReason = "ERROR" as RejectionReason): void {
    const claim = _registry.pending[claimId];
    if (!claim) return;
    claim.status = "rejected";
    claim.rejectionReason = reason;
    claim.rejectedAtMs = Date.now();
    delete _registry.pending[claimId];
    schedulePersist();
  },

  /**
   * Record cooldown for a symbol when a trade closes.
   */
  recordClose(symbol: string): void {
    _registry.cooldowns[symbol] = Date.now();
    schedulePersist();
  },

  /** Number of active (pending) claims. */
  pendingCount(): number {
    sweepExpired();
    return Object.keys(_registry.pending).length;
  },

  /** All pending claims. */
  allPending(): Claim[] {
    sweepExpired();
    return Object.values(_registry.pending);
  },

  /** Check if a symbol+side is claimed. */
  isClaimed(symbol: string, side: string): boolean {
    sweepExpired();
    const key = claimKey(symbol, side);
    return Object.values(_registry.pending).some(
      (c) => c.status === "pending" && claimKey(c.symbol, c.side) === key,
    );
  },

  /** Debug dump. */
  dump(): RegistryState {
    sweepExpired();
    return { ..._registry };
  },

  /**
   * Clear stale cooldowns and all pending claims on startup.
   * Called once from portfolioController.start() so leftover cooldowns
   * from a previous server session cannot block re-entries in the new one.
   * Recent fills are preserved for audit purposes.
   */
  resetForStartup(): void {
    sweepExpired();
    const pendingBefore   = Object.keys(_registry.pending).length;
    const cooldownsBefore = Object.keys(_registry.cooldowns).length;

    // Drop all pending claims (they reference candidates that no longer exist)
    _registry.pending   = {};
    // Drop all cooldowns — new session, fresh slate
    _registry.cooldowns = {};

    schedulePersist();
    console.log(
      `[ClaimRegistry] Startup reset — cleared ${pendingBefore} pending claims, ` +
      `${cooldownsBefore} cooldowns`,
    );
  },
};

// ── Helper ────────────────────────────────────────────────────────────────────

function reject(
  reason: RejectionReason,
  detail: string,
): { granted: false; reason: RejectionReason; detail: string } {
  return { granted: false, reason, detail };
}
