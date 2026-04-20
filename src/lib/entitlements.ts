import type { Role } from "@/lib/roles";

export type Plan = "FREE" | "PREMIUM";

export type Viewer = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  role: Role;
  accountStatus: "ACTIVE" | "DISABLED";
  emailVerified: boolean;
  lastLoginAt: string | null;
  subscription: {
    plan: Plan;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    entitlements: Record<string, unknown>;
  } | null;
};

export type ResolvedEntitlements = {
  plan: Plan;
  status: string;
  isAuthenticated: boolean;
  accountActive: boolean;
  isPremium: boolean;
  isAdmin: boolean;
  canViewLiveSignals: boolean;
  canViewDelayedSignals: boolean;
  canViewFullHistory: boolean;
  canAccessPremiumIntelligence: boolean;
  canUseAdvancedWatchlists: boolean;
  canUseRealtimeAlerts: boolean;
  canAccessBilling: boolean;
  canManageMembers: boolean;
  canUseScannerControls: boolean;
  canUseIntegrityControls: boolean;
  maxWatchlists: number;
  maxAlerts: number;
  signalDelayMinutes: number;
};

function hasActivePremium(viewer: Viewer | null) {
  if (!viewer?.subscription) return false;
  return viewer.subscription.plan === "PREMIUM" && ["active", "trialing", "past_due"].includes(viewer.subscription.status);
}

export function resolveEntitlements(viewer: Viewer | null): ResolvedEntitlements {
  const isAuthenticated = Boolean(viewer);
  const accountActive = viewer ? viewer.accountStatus === "ACTIVE" : true;
  const isAdmin = viewer ? viewer.role === "ADMIN" || viewer.role === "SUPERADMIN" : false;
  const isPremium = isAdmin || hasActivePremium(viewer);

  return {
    plan: isPremium ? "PREMIUM" : "FREE",
    status: viewer?.subscription?.status ?? (viewer ? "free" : "guest"),
    isAuthenticated,
    accountActive,
    isPremium,
    isAdmin,
    canViewLiveSignals: isPremium,
    canViewDelayedSignals: true,
    canViewFullHistory: isPremium,
    canAccessPremiumIntelligence: isPremium,
    canUseAdvancedWatchlists: isPremium,
    canUseRealtimeAlerts: isPremium,
    canAccessBilling: isAuthenticated && accountActive,
    canManageMembers: isAdmin,
    canUseScannerControls: isAdmin,
    canUseIntegrityControls: isAdmin,
    maxWatchlists: isPremium ? 20 : 3,
    maxAlerts: isPremium ? 50 : 5,
    signalDelayMinutes: isPremium ? 0 : 15,
  };
}
