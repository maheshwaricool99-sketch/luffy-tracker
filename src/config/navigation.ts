import type { Viewer } from "@/lib/entitlements";
import { resolveEntitlements } from "@/lib/entitlements";

export type NavItem = {
  label: string;
  href: string;
  section: "primary" | "utility" | "admin";
  short: string;
  visibility: "public" | "authenticated" | "premium" | "admin";
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", section: "primary", short: "HM", visibility: "public" },
  { label: "Signals", href: "/signals", section: "primary", short: "SG", visibility: "public" },
  { label: "Analysis", href: "/analysis", section: "primary", short: "AN", visibility: "public" },
  { label: "Pricing", href: "/pricing", section: "primary", short: "PR", visibility: "public" },
  { label: "Intelligence", href: "/intelligence", section: "primary", short: "IQ", visibility: "premium" },
  { label: "Performance", href: "/performance", section: "primary", short: "PF", visibility: "public" },
  { label: "Health", href: "/health", section: "primary", short: "HL", visibility: "authenticated" },
  { label: "Account", href: "/account", section: "utility", short: "AC", visibility: "authenticated" },
  { label: "Billing", href: "/billing", section: "utility", short: "BL", visibility: "authenticated" },
  { label: "Watchlists", href: "/watchlists", section: "utility", short: "WL", visibility: "authenticated" },
  { label: "Alerts", href: "/alerts", section: "utility", short: "AL", visibility: "authenticated" },
  { label: "Members", href: "/admin/members", section: "admin", short: "MB", visibility: "admin" },
  { label: "System", href: "/admin/system", section: "admin", short: "SY", visibility: "admin" },
  { label: "Engines", href: "/admin/engines", section: "admin", short: "EN", visibility: "admin" },
  { label: "Scanners", href: "/admin/scanners", section: "admin", short: "SC", visibility: "admin" },
  { label: "Integrity", href: "/admin/integrity", section: "admin", short: "IN", visibility: "admin" },
  { label: "Experiments", href: "/admin/experiments", section: "admin", short: "EX", visibility: "admin" },
  { label: "Lab", href: "/admin/lab", section: "admin", short: "LB", visibility: "admin" },
];

export function getVisibleNavItems(viewer: Viewer | null) {
  const entitlements = resolveEntitlements(viewer);
  return NAV_ITEMS.filter((item) => {
    if (item.visibility === "public") return true;
    if (item.visibility === "authenticated") return entitlements.isAuthenticated && entitlements.accountActive;
    if (item.visibility === "premium") return entitlements.isPremium && entitlements.accountActive;
    if (item.visibility === "admin") {
      if (!entitlements.isAdmin || !entitlements.accountActive) return false;
      if (item.href === "/admin/lab" && viewer?.role !== "SUPERADMIN") return false;
      return true;
    }
    return false;
  });
}
