import { randomUUID } from "node:crypto";
import { nowIso } from "@/lib/db";
import { getAllProviderManagers } from "@/lib/market-data/managers/provider-manager";
import { resetProviderCacheForTests } from "@/lib/market-data/cache/provider-cache";
import { clearSnapshotRecordsForTests } from "@/lib/market-data/cache/snapshot-cache";
import { getRecoveryController } from "@/lib/market-data/recovery/recovery-controller";
import { recordEngineAudit } from "./engine-audit";
import { readEngineState, writeEngineState } from "./engine-state-store";
import { EXECUTION_MODES, type ExecutionMode, type EngineActionResult } from "./engine-types";

type Actor = {
  id: string;
  email: string;
  role: string;
};

type ActionOpts = {
  actor: Actor;
  reason?: string;
};

const inflight = globalThis.__engineInflightActions ?? new Set<string>();
declare global {
  var __engineInflightActions: Set<string> | undefined;
}
if (!globalThis.__engineInflightActions) globalThis.__engineInflightActions = inflight;

function ok(engine: string, action: string, message: string, auditId: string, status: "accepted" | "success" = "accepted"): EngineActionResult {
  return {
    ok: true,
    engine,
    action,
    status,
    message,
    auditId,
    requestedAt: nowIso(),
  };
}

function fail(engine: string, action: string, errorCode: string, message: string): EngineActionResult {
  return { ok: false, engine, action, errorCode, message };
}

function guardInflight(key: string): boolean {
  if (inflight.has(key)) return false;
  inflight.add(key);
  return true;
}
function releaseInflight(key: string) {
  inflight.delete(key);
}

// ─────────────────────────────────────────────── Price

export async function restartPriceEngine(opts: ActionOpts): Promise<EngineActionResult> {
  const current = readEngineState("price");
  if (current?.status === "restarting") {
    return fail("price", "restart", "ENGINE_ALREADY_RESTARTING", "Price Engine is already restarting");
  }
  if (!guardInflight("price:restart")) {
    return fail("price", "restart", "ACTION_IN_PROGRESS", "A restart action is already in progress");
  }

  const event = recordEngineAudit({
    engine: "price",
    action: "price.restart.requested",
    result: "accepted",
    actorId: opts.actor.id,
    actorEmail: opts.actor.email,
    actorRole: opts.actor.role,
    reason: opts.reason ?? null,
  });

  writeEngineState("price", {
    status: "restarting",
    lastRestartAt: nowIso(),
    lastRestartBy: opts.actor.email,
  });

  (async () => {
    const started = Date.now();
    try {
      for (const manager of getAllProviderManagers()) {
        await manager.hardResetActiveProvider("ADMIN_RESTART");
      }
      getRecoveryController().start();
      writeEngineState("price", {
        status: "live",
        lastHealthyAt: nowIso(),
        lastHeartbeatAt: nowIso(),
      });
      recordEngineAudit({
        engine: "price",
        action: "price.restart.completed",
        result: "success",
        actorId: opts.actor.id,
        actorEmail: opts.actor.email,
        actorRole: opts.actor.role,
        metadata: { latencyMs: Date.now() - started },
      });
    } catch (error) {
      writeEngineState("price", { status: "down", reasonCode: "RESTART_FAILED", reason: String((error as Error).message ?? error) });
      recordEngineAudit({
        engine: "price",
        action: "price.restart.failed",
        result: "failed",
        actorId: opts.actor.id,
        actorEmail: opts.actor.email,
        actorRole: opts.actor.role,
        reason: String((error as Error).message ?? error),
        metadata: { latencyMs: Date.now() - started },
      });
    } finally {
      releaseInflight("price:restart");
    }
  })();

  return ok("price", "restart", "Price Engine restart initiated", event.id);
}

export async function reconnectPriceProviders(opts: ActionOpts): Promise<EngineActionResult> {
  if (!guardInflight("price:reconnect")) {
    return fail("price", "reconnect", "ACTION_IN_PROGRESS", "A reconnect action is already in progress");
  }
  const event = recordEngineAudit({
    engine: "price",
    action: "price.reconnect.requested",
    result: "accepted",
    actorId: opts.actor.id,
    actorEmail: opts.actor.email,
    actorRole: opts.actor.role,
    reason: opts.reason ?? null,
  });
  (async () => {
    try {
      for (const manager of getAllProviderManagers()) {
        await manager.ensureHealthy();
      }
      recordEngineAudit({
        engine: "price",
        action: "price.reconnect.completed",
        result: "success",
        actorId: opts.actor.id,
        actorEmail: opts.actor.email,
        actorRole: opts.actor.role,
      });
    } finally {
      releaseInflight("price:reconnect");
    }
  })();
  return ok("price", "reconnect", "Provider reconnect initiated", event.id);
}

export async function reloadPriceProviders(opts: ActionOpts): Promise<EngineActionResult> {
  if (!guardInflight("price:reload")) {
    return fail("price", "reload_providers", "ACTION_IN_PROGRESS", "A reload action is already in progress");
  }
  const event = recordEngineAudit({
    engine: "price",
    action: "price.providers.reloaded",
    result: "accepted",
    actorId: opts.actor.id,
    actorEmail: opts.actor.email,
    actorRole: opts.actor.role,
    reason: opts.reason ?? null,
  });
  (async () => {
    try {
      for (const manager of getAllProviderManagers()) {
        await manager.hardResetActiveProvider("ADMIN_RELOAD_PROVIDERS");
      }
      recordEngineAudit({
        engine: "price",
        action: "price.providers.reloaded",
        result: "success",
        actorId: opts.actor.id,
        actorEmail: opts.actor.email,
        actorRole: opts.actor.role,
      });
    } finally {
      releaseInflight("price:reload");
    }
  })();
  return ok("price", "reload_providers", "Provider adapters reloaded", event.id);
}

export async function flushPriceCache(opts: ActionOpts): Promise<EngineActionResult> {
  const event = recordEngineAudit({
    engine: "price",
    action: "price.cache.flushed",
    result: "success",
    actorId: opts.actor.id,
    actorEmail: opts.actor.email,
    actorRole: opts.actor.role,
    reason: opts.reason ?? null,
  });
  resetProviderCacheForTests();
  clearSnapshotRecordsForTests();
  return ok("price", "flush_cache", "Price cache flushed", event.id, "success");
}

// ─────────────────────────────────────────────── Execution

export async function reloadExecutionConfig(opts: ActionOpts): Promise<EngineActionResult> {
  const event = recordEngineAudit({
    engine: "execution",
    action: "execution.config.reloaded",
    result: "success",
    actorId: opts.actor.id,
    actorEmail: opts.actor.email,
    actorRole: opts.actor.role,
    reason: opts.reason ?? null,
  });
  writeEngineState("execution", {
    lastConfigChangeAt: nowIso(),
    lastConfigChangeBy: opts.actor.email,
  });
  return ok("execution", "reload_config", "Execution config reloaded", event.id, "success");
}

export async function restartExecutionEngine(opts: ActionOpts): Promise<EngineActionResult> {
  const current = readEngineState("execution");
  if (current?.status === "restarting") {
    return fail("execution", "restart", "ENGINE_ALREADY_RESTARTING", "Execution service is already restarting");
  }
  if (!guardInflight("execution:restart")) {
    return fail("execution", "restart", "ACTION_IN_PROGRESS", "A restart action is already in progress");
  }
  const event = recordEngineAudit({
    engine: "execution",
    action: "execution.restart.requested",
    result: "accepted",
    actorId: opts.actor.id,
    actorEmail: opts.actor.email,
    actorRole: opts.actor.role,
    reason: opts.reason ?? null,
  });
  writeEngineState("execution", {
    status: "restarting",
    lastRestartAt: nowIso(),
    lastRestartBy: opts.actor.email,
  });
  setTimeout(() => {
    const previousMode = (current?.mode as ExecutionMode | undefined) ?? "signal_only";
    writeEngineState("execution", {
      status: previousMode === "active" ? "active" : previousMode === "disabled_by_admin" ? "disabled_by_admin" : "inactive_by_design",
      mode: previousMode,
    });
    recordEngineAudit({
      engine: "execution",
      action: "execution.restart.completed",
      result: "success",
      actorId: opts.actor.id,
      actorEmail: opts.actor.email,
      actorRole: opts.actor.role,
    });
    releaseInflight("execution:restart");
  }, 500);
  return ok("execution", "restart", "Execution service restart initiated", event.id);
}

const TEST_MODE_FEATURE_FLAG = "FEATURE_EXECUTION_MODE_SWITCH";

export async function setExecutionMode(opts: ActionOpts & { mode: string }): Promise<EngineActionResult> {
  if (!(EXECUTION_MODES as readonly string[]).includes(opts.mode)) {
    return fail("execution", "set_mode", "INVALID_MODE", `Unknown mode: ${opts.mode}`);
  }
  const nextMode = opts.mode as ExecutionMode;

  if ((nextMode === "active" || nextMode === "internal_test_only") && process.env[TEST_MODE_FEATURE_FLAG] !== "1") {
    return fail("execution", "set_mode", "MODE_FEATURE_FLAG_REQUIRED", "Enabling execution requires a server feature flag");
  }

  const current = readEngineState("execution");
  const previousMode = (current?.mode as ExecutionMode | undefined) ?? "signal_only";
  if (previousMode === nextMode) {
    return fail("execution", "set_mode", "MODE_UNCHANGED", `Mode is already ${nextMode}`);
  }

  const event = recordEngineAudit({
    engine: "execution",
    action: "execution.mode.changed",
    result: "success",
    actorId: opts.actor.id,
    actorEmail: opts.actor.email,
    actorRole: opts.actor.role,
    reason: opts.reason ?? null,
    metadata: { from: previousMode, to: nextMode },
  });

  const status =
    nextMode === "active" ? "active" :
    nextMode === "disabled_by_admin" ? "disabled_by_admin" :
    nextMode === "internal_test_only" ? "active" :
    "inactive_by_design";

  writeEngineState("execution", {
    status,
    mode: nextMode,
    lastConfigChangeAt: nowIso(),
    lastConfigChangeBy: opts.actor.email,
  });

  return ok("execution", "set_mode", `Execution mode changed to ${nextMode}`, event.id, "success");
}
