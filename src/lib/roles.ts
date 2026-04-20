export const ROLES = ["GUEST", "MEMBER", "ADMIN", "SUPERADMIN", "SUPPORT", "ANALYST"] as const;

export type Role = (typeof ROLES)[number];

const order: Role[] = ["GUEST", "MEMBER", "ANALYST", "SUPPORT", "ADMIN", "SUPERADMIN"];

export function isRole(value: string | null | undefined): value is Role {
  return ROLES.includes((value ?? "") as Role);
}

export function hasRole(atLeast: Role, actual: Role) {
  return order.indexOf(actual) >= order.indexOf(atLeast);
}

export function isAdminRole(role: Role | null | undefined) {
  return role === "ADMIN" || role === "SUPERADMIN";
}
