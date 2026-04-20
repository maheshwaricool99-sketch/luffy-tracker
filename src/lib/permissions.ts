import { hasRole, isAdminRole, type Role } from "@/lib/roles";

export function canAccessAdminRoute(role: Role, path: string) {
  if (path.startsWith("/admin/lab")) return role === "SUPERADMIN";
  return hasRole("ADMIN", role);
}

export function assertRole(role: Role, required: Role, message = "forbidden") {
  if (!hasRole(required, role)) {
    throw new Error(message);
  }
}

export function canViewAdmin(role: Role | null | undefined) {
  return isAdminRole(role ?? null);
}

export function canManageMembers(role: Role | null | undefined) {
  return isAdminRole(role ?? null);
}

export function canUseScannerControls(role: Role | null | undefined) {
  return isAdminRole(role ?? null);
}

export function canUseIntegrityControls(role: Role | null | undefined) {
  return isAdminRole(role ?? null);
}
