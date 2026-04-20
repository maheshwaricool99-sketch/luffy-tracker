export const PRICE_ENGINE_STATUSES = ["live", "degraded", "down", "starting", "restarting", "paused"] as const;
export type PriceEngineStatusValue = (typeof PRICE_ENGINE_STATUSES)[number];

export const EXECUTION_ENGINE_STATUSES = ["active", "inactive_by_design", "disabled_by_admin", "restarting", "error"] as const;
export type ExecutionEngineStatusValue = (typeof EXECUTION_ENGINE_STATUSES)[number];

export const EXECUTION_MODES = ["signal_only", "disabled_by_admin", "internal_test_only", "active"] as const;
export type ExecutionMode = (typeof EXECUTION_MODES)[number];

export const OVERALL_STATUSES = ["operational", "degraded", "partial_outage", "down"] as const;
export type OverallStatusValue = (typeof OVERALL_STATUSES)[number];

export type ProviderMode = "ws" | "rest" | "hybrid" | "snapshot" | "unknown";

export type PriceEngineStatus = {
  name: "price";
  status: PriceEngineStatusValue;
  heartbeatAgoSec: number | null;
  lastHeartbeatAt: string | null;
  lastHealthyAt: string | null;
  marketsLive: number;
  marketsTotal: number;
  errorRatePct: number;
  providerMode: ProviderMode;
  openConnections: number;
  staleSymbols: number;
  lastRestartAt: string | null;
  lastRestartBy: string | null;
  reasonCode: string | null;
  reason: string | null;
  impact: string[];
  availableActions: string[];
};

export type ExecutionEngineStatus = {
  name: "execution";
  status: ExecutionEngineStatusValue;
  mode: ExecutionMode;
  executionEnabled: boolean;
  paperTradingEnabled: boolean;
  brokerConnectivityRequired: boolean;
  heartbeatAgoSec: number | null;
  lastHeartbeatAt: string | null;
  lastConfigChangeAt: string | null;
  lastConfigChangedBy: string | null;
  lastRestartAt: string | null;
  reasonCode: string | null;
  reason: string | null;
  impact: string[];
  availableActions: string[];
};

export type OverallStatus = {
  status: OverallStatusValue;
  reason: string;
  updatedAt: string;
};

export type EngineStatusResponse = {
  priceEngine: PriceEngineStatus;
  executionEngine: ExecutionEngineStatus;
  overall: OverallStatus;
};

export type EngineAuditEvent = {
  id: string;
  engine: string;
  action: string;
  result: "accepted" | "success" | "failed";
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type EngineActionResultOk = {
  ok: true;
  engine: string;
  action: string;
  status: "accepted" | "success";
  message: string;
  auditId: string;
  requestedAt: string;
};

export type EngineActionResultFail = {
  ok: false;
  engine: string;
  action: string;
  errorCode: string;
  message: string;
};

export type EngineActionResult = EngineActionResultOk | EngineActionResultFail;
