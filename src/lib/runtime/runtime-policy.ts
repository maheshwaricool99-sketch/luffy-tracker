import type { Role } from "@/lib/roles";
import type { RuntimeFlags } from "./runtime-types";
import { RuntimePolicyError } from "./runtime-errors";

export function canProcessSignup(flags: RuntimeFlags) {
  if (flags.maintenance_mode) throw new RuntimePolicyError("MAINTENANCE_MODE_ACTIVE", 503, "The platform is temporarily unavailable due to maintenance.");
  if (flags.read_only_mode) throw new RuntimePolicyError("READ_ONLY_MODE_ENABLED", 503, "Signups are temporarily unavailable while the platform is in read-only mode.");
  if (flags.disable_signup) throw new RuntimePolicyError("SIGNUPS_DISABLED", 403, "Signups are temporarily disabled.");
}

export function canCreateCheckout(flags: RuntimeFlags) {
  if (flags.maintenance_mode) throw new RuntimePolicyError("MAINTENANCE_MODE_ACTIVE", 503, "Checkout is unavailable during maintenance mode.");
  if (flags.read_only_mode) throw new RuntimePolicyError("READ_ONLY_MODE_ENABLED", 503, "Billing mutations are temporarily disabled while the platform is read-only.");
  if (flags.freeze_upgrades) throw new RuntimePolicyError("UPGRADES_FROZEN", 403, "Premium upgrades are temporarily frozen.");
}

export function canOpenBillingPortal(flags: RuntimeFlags) {
  if (flags.maintenance_mode) throw new RuntimePolicyError("MAINTENANCE_MODE_ACTIVE", 503, "Billing portal access is unavailable during maintenance mode.");
  if (flags.read_only_mode || flags.freeze_upgrades) throw new RuntimePolicyError("UPGRADES_FROZEN", 403, "Billing changes are temporarily frozen.");
}

export function canPublishSignal(flags: RuntimeFlags) {
  if (flags.maintenance_mode) throw new RuntimePolicyError("MAINTENANCE_MODE_ACTIVE", 503, "Signal publishing is unavailable during maintenance mode.");
  if (flags.pause_signal_publishing) throw new RuntimePolicyError("SIGNAL_PUBLISHING_PAUSED", 409, "Signal publishing is paused by runtime control.");
}

export function canRunScanners(flags: RuntimeFlags) {
  if (flags.maintenance_mode) throw new RuntimePolicyError("MAINTENANCE_MODE_ACTIVE", 503, "Scanners are paused while the platform is in maintenance mode.");
  if (flags.pause_scanners) throw new RuntimePolicyError("SCANNERS_PAUSED", 409, "Scanners are paused by runtime control.");
}

export function canServeExperiments(flags: RuntimeFlags) {
  if (flags.pause_experiments) throw new RuntimePolicyError("EXPERIMENTS_PAUSED", 409, "Experiments are paused and the stable variant must be served.");
}

export function assertWritableOrThrow(flags: RuntimeFlags, options?: { allowRuntimeControl?: boolean }) {
  if (flags.maintenance_mode) throw new RuntimePolicyError("MAINTENANCE_MODE_ACTIVE", 503, "Writes are unavailable during maintenance mode.");
  if (flags.read_only_mode && !options?.allowRuntimeControl) {
    throw new RuntimePolicyError("READ_ONLY_MODE_ENABLED", 503, "This operation is disabled while the platform is in read-only mode.");
  }
}

export function canBypassMaintenanceForPath(pathname: string, role: Role | null | undefined) {
  if (pathname.startsWith("/admin")) return role === "ADMIN" || role === "SUPERADMIN";
  if (pathname === "/health" || pathname.startsWith("/api/health")) return true;
  if (pathname.startsWith("/login")) return true;
  return false;
}
