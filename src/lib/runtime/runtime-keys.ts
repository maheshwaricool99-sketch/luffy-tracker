export const RuntimeFlagKeys = {
  MAINTENANCE_MODE: "maintenance_mode",
  READ_ONLY_MODE: "read_only_mode",
  DISABLE_SIGNUP: "disable_signup",
  PAUSE_SIGNAL_PUBLISHING: "pause_signal_publishing",
  PAUSE_SCANNERS: "pause_scanners",
  FREEZE_UPGRADES: "freeze_upgrades",
  PAUSE_EXPERIMENTS: "pause_experiments",
} as const;

export type RuntimeFlagKey = typeof RuntimeFlagKeys[keyof typeof RuntimeFlagKeys];

export const RuntimeFlagKeyList: RuntimeFlagKey[] = Object.values(RuntimeFlagKeys);
