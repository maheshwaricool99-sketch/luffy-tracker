import { requireUser } from "./requireUser";

export async function requirePremium() {
  const user = await requireUser();
  if (!["PREMIUM", "ADMIN", "SUPERADMIN"].includes(user.appRole)) {
    throw new Error("Premium access required");
  }
  return user;
}
