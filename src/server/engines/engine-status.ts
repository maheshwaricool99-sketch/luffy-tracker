import { getAllProviderManagers } from "@/lib/market-data/managers/provider-manager";
import { readEngineState } from "./engine-state-store";
import type {
  EngineStatusResponse,
  ExecutionEngineStatus,
  ExecutionEngineStatusValue,
  ExecutionMode,
  OverallStatus,
  OverallStatusValue,
  PriceEngineStatus,
  PriceEngineStatusValue,
  ProviderMode,
} from "./engine-types";

const PRICE_ACTIONS = ["restart", "reconnect", "reload_providers", "flush_cache"] as const;

function computePriceEngineStatus(): PriceEngineStatus {
  const state = readEngineState("price");
  const managers = getAllProviderManagers();
  const statuses = managers.map((m) => m.getStatus());

  const marketsTotal = statuses.length;
  const marketsLive = statuses.filter((s) => s.providerState === "live").length;
  const marketsDegraded = statuses.filter((s) => s.providerState === "degraded" || s.providerState === "fallback" || s.providerState === "recovering").length;

  const totalProviders = statuses.reduce((sum, s) => sum + s.providers.length, 0);
  const failingProviders = statuses.reduce(
    (sum, s) => sum + s.providers.filter((p) => p.state === "failed" || p.state === "disconnected").length,
    0,
  );
  const errorRatePct = totalProviders > 0 ? Math.round((failingProviders / totalProviders) * 100) : 0;

  const lastHeartbeatMs = Math.max(0, ...statuses.map((s) => s.lastProviderSuccessMs ?? 0));
  const lastHealthyMs = Math.max(0, ...statuses.map((s) => s.lastLiveSuccessMs ?? 0));
  const lastHeartbeatAt = lastHeartbeatMs > 0 ? new Date(lastHeartbeatMs).toISOString() : null;
  const lastHealthyAt = lastHealthyMs > 0 ? new Date(lastHealthyMs).toISOString() : null;
  const heartbeatAgoSec = lastHeartbeatMs > 0 ? Math.floor((Date.now() - lastHeartbeatMs) / 1000) : null;

  const openConnections = statuses.reduce(
    (sum, s) => sum + s.providers.filter((p) => p.state === "live" || p.state === "degraded").length,
    0,
  );
  const staleSymbols = statuses.reduce((sum, s) => {
    if (s.snapshotAgeMs === null) return sum;
    return s.signalsPublishable ? sum : sum + (s.scannerStatus.symbolsAttempted || 0);
  }, 0);

  const providerModes: ProviderMode[] = statuses.map((s) => {
    const id = s.activeProviderId ?? "";
    if (id.includes("-ws")) return "ws";
    if (s.snapshotActive && !s.signalsPublishable) return "snapshot";
    if (id.includes("-rest") || id.includes("yahoo") || id.includes("nse") || id.includes("finnhub") || id.includes("alpha")) return "rest";
    if (id) return "hybrid";
    return "unknown";
  });
  const providerMode: ProviderMode = providerModes.every((m) => m === providerModes[0]) ? providerModes[0] ?? "unknown" : "hybrid";

  let status: PriceEngineStatusValue;
  let reasonCode: string | null = null;
  let reason: string | null = null;

  if (state?.status === "restarting") {
    status = "restarting";
    reasonCode = "RESTART_IN_PROGRESS";
    reason = "Price engine restart is in progress.";
  } else if (state?.status === "paused") {
    status = "paused";
    reasonCode = "ENGINE_PAUSED";
    reason = "Price engine has been intentionally paused by an admin.";
  } else if (marketsLive === 0 && marketsDegraded === 0) {
    status = "down";
    reasonCode = "NO_LIVE_MARKETS";
    reason = "No market data providers are currently healthy.";
  } else if (marketsLive < marketsTotal || statuses.some((s) => !s.signalsPublishable)) {
    status = "degraded";
    reasonCode = "PARTIAL_COVERAGE";
    reason = "One or more markets are operating in degraded or fallback mode.";
  } else {
    status = "live";
  }

  const impact: string[] = [];
  if (status === "down" || status === "degraded") {
    for (const s of statuses) {
      if (s.providerState === "live") continue;
      const label = s.market === "crypto" ? "Crypto" : s.market === "us" ? "US" : "India";
      impact.push(`${label} market live pricing ${s.providerState === "failed" || s.providerState === "disconnected" ? "unavailable" : "degraded"}`);
    }
    impact.push("Signal freshness and confidence computation may be affected");
  }

  return {
    name: "price",
    status,
    heartbeatAgoSec,
    lastHeartbeatAt,
    lastHealthyAt,
    marketsLive,
    marketsTotal,
    errorRatePct,
    providerMode,
    openConnections,
    staleSymbols,
    lastRestartAt: state?.lastRestartAt ?? null,
    lastRestartBy: state?.lastRestartBy ?? null,
    reasonCode,
    reason,
    impact,
    availableActions: [...PRICE_ACTIONS],
  };
}

const EXECUTION_DEFAULTS = {
  status: "inactive_by_design" as ExecutionEngineStatusValue,
  mode: "signal_only" as ExecutionMode,
  reasonCode: "SIGNAL_PLATFORM_ONLY",
  reason: "Execution is intentionally disabled for this deployment. This platform is configured to publish signals only.",
};

const EXECUTION_ACTIONS = ["reload_config", "restart"] as const;

export function computeExecutionEngineStatus(): ExecutionEngineStatus {
  const state = readEngineState("execution");
  const mode = (state?.mode as ExecutionMode | undefined) ?? EXECUTION_DEFAULTS.mode;

  let status: ExecutionEngineStatusValue;
  let reasonCode: string | null;
  let reason: string | null;

  if (state?.status === "restarting") {
    status = "restarting";
    reasonCode = "RESTART_IN_PROGRESS";
    reason = "Execution service restart is in progress.";
  } else if (mode === "active") {
    status = "active";
    reasonCode = null;
    reason = "Execution is active and routing orders.";
  } else if (mode === "disabled_by_admin") {
    status = "disabled_by_admin";
    reasonCode = "DISABLED_BY_ADMIN";
    reason = state?.reason ?? "Execution is disabled by an administrator.";
  } else if (mode === "internal_test_only") {
    status = "active";
    reasonCode = "INTERNAL_TEST_MODE";
    reason = "Execution is running in internal test mode. Not available to end users.";
  } else {
    status = EXECUTION_DEFAULTS.status;
    reasonCode = EXECUTION_DEFAULTS.reasonCode;
    reason = EXECUTION_DEFAULTS.reason;
  }

  const executionEnabled = mode === "active" || mode === "internal_test_only";
  const impact = executionEnabled
    ? ["Live execution is processing orders"]
    : [
        "No live order placement",
        "No paper execution routing",
        "No broker connectivity",
      ];

  const actions: string[] = [...EXECUTION_ACTIONS];
  if (process.env.FEATURE_EXECUTION_MODE_SWITCH === "1") actions.push("set_mode");

  return {
    name: "execution",
    status,
    mode,
    executionEnabled,
    paperTradingEnabled: false,
    brokerConnectivityRequired: mode === "active",
    heartbeatAgoSec: null,
    lastHeartbeatAt: null,
    lastConfigChangeAt: state?.lastConfigChangeAt ?? null,
    lastConfigChangedBy: state?.lastConfigChangeBy ?? null,
    lastRestartAt: state?.lastRestartAt ?? null,
    reasonCode,
    reason,
    impact,
    availableActions: actions,
  };
}

function computeOverall(price: PriceEngineStatus, execution: ExecutionEngineStatus): OverallStatus {
  let status: OverallStatusValue;
  const notes: string[] = [];

  if (price.status === "down") {
    status = "partial_outage";
    notes.push("Price infrastructure is down.");
  } else if (price.status === "degraded" || price.status === "restarting" || price.status === "paused") {
    status = "degraded";
    notes.push(`Price infrastructure is ${price.status}.`);
  } else {
    status = "operational";
  }

  if (execution.status === "error") {
    status = status === "operational" ? "degraded" : "partial_outage";
    notes.push("Execution engine reported an error state.");
  } else if (execution.status === "inactive_by_design") {
    notes.push("Execution is inactive by design.");
  } else if (execution.status === "disabled_by_admin") {
    notes.push("Execution is disabled by admin.");
  }

  return {
    status,
    reason: notes.join(" ") || "All systems operating normally.",
    updatedAt: new Date().toISOString(),
  };
}

export function computeEngineStatus(): EngineStatusResponse {
  const priceEngine = computePriceEngineStatus();
  const executionEngine = computeExecutionEngineStatus();
  const overall = computeOverall(priceEngine, executionEngine);
  return { priceEngine, executionEngine, overall };
}
