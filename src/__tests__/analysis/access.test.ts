import { getAnalysisEntitlements } from "@/lib/analysis/access";
import type { Viewer } from "@/lib/entitlements";

describe("analysis entitlements", () => {
  it("returns locked entitlements for guest", () => {
    const entitlements = getAnalysisEntitlements(null);
    expect(entitlements.canViewFullTradePlan).toBe(false);
    expect(entitlements.canViewRealtime).toBe(false);
    expect(entitlements.canViewEventAlerts).toBe(true);
  });

  it("returns premium entitlements for premium users", () => {
    const viewer: Viewer = {
      id: "u1",
      email: "premium@example.com",
      name: null,
      username: null,
      role: "MEMBER",
      accountStatus: "ACTIVE",
      emailVerified: true,
      lastLoginAt: null,
      subscription: {
        plan: "PREMIUM",
        status: "active",
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        entitlements: {},
      },
    };
    const entitlements = getAnalysisEntitlements(viewer);
    expect(entitlements.canViewFullTradePlan).toBe(true);
    expect(entitlements.canViewRealtime).toBe(true);
    expect(entitlements.canViewOrderBook).toBe(true);
  });
});
