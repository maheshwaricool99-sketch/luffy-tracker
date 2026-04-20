import {
  RuntimePolicyError,
  assertWritableOrThrow,
  canCreateCheckout,
  canOpenBillingPortal,
  canProcessSignup,
  canPublishSignal,
  canRunScanners,
  canServeExperiments,
} from "@/lib/runtime";
import type { RuntimeFlags } from "@/lib/runtime";

function makeFlags(overrides: Partial<RuntimeFlags> = {}): RuntimeFlags {
  return {
    maintenance_mode: false,
    read_only_mode: false,
    disable_signup: false,
    pause_signal_publishing: false,
    pause_scanners: false,
    freeze_upgrades: false,
    pause_experiments: false,
    ...overrides,
  };
}

describe("runtime policy", () => {
  it("blocks signup when signups are disabled", () => {
    expect(() => canProcessSignup(makeFlags({ disable_signup: true }))).toThrow(RuntimePolicyError);
    expect(() => canProcessSignup(makeFlags({ disable_signup: true }))).toThrow("Signups are temporarily disabled.");
  });

  it("blocks checkout and portal when upgrades are frozen", () => {
    expect(() => canCreateCheckout(makeFlags({ freeze_upgrades: true }))).toThrow("Premium upgrades are temporarily frozen.");
    expect(() => canOpenBillingPortal(makeFlags({ freeze_upgrades: true }))).toThrow("Billing changes are temporarily frozen.");
  });

  it("blocks signal publication and scanner execution when paused", () => {
    expect(() => canPublishSignal(makeFlags({ pause_signal_publishing: true }))).toThrow("Signal publishing is paused by runtime control.");
    expect(() => canRunScanners(makeFlags({ pause_scanners: true }))).toThrow("Scanners are paused by runtime control.");
  });

  it("blocks writes in read-only mode unless runtime control is explicitly allowed", () => {
    expect(() => assertWritableOrThrow(makeFlags({ read_only_mode: true }))).toThrow("This operation is disabled while the platform is in read-only mode.");
    expect(() => assertWritableOrThrow(makeFlags({ read_only_mode: true }), { allowRuntimeControl: true })).not.toThrow();
  });

  it("forces stable variants when experiments are paused", () => {
    expect(() => canServeExperiments(makeFlags({ pause_experiments: true }))).toThrow("Experiments are paused and the stable variant must be served.");
  });
});
