import { redirect } from "next/navigation";
import { getSessionUser } from "./getSessionUser";

export async function requireUser() {
  const user = await getSessionUser();
  if (!user || user.accountStatus !== "ACTIVE") redirect("/login");
  return user;
}
