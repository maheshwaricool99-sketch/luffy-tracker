import type { RuntimeFlagKey } from "./runtime-keys";

export type RuntimeFlags = {
  maintenance_mode: boolean;
  read_only_mode: boolean;
  disable_signup: boolean;
  pause_signal_publishing: boolean;
  pause_scanners: boolean;
  freeze_upgrades: boolean;
  pause_experiments: boolean;
};

export type RuntimeFlagRecord = {
  id: string;
  key: RuntimeFlagKey;
  enabled: boolean;
  valueJson: Record<string, unknown> | null;
  description: string | null;
  updatedByUserId: string | null;
  updatedAt: string;
  createdAt: string;
  version: number;
};

export type RuntimeFlagMutationContext = {
  actorUserId: string | null;
  actorEmail: string | null;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  source: "admin_ui" | "api" | "system" | "migration";
};

export type RuntimeFlagsSnapshot = {
  flags: RuntimeFlags;
  updatedAt: string;
  version: number;
  lastLoadedAt: number;
};
