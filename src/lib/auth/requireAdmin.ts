import { requireUser } from "./requireUser";

export async function requireAdmin() {
  const user = await requireUser();
  if (!["ADMIN", "SUPERADMIN"].includes(user.appRole)) {
    throw new Error("Admin access required");
  }
  return user;
}
