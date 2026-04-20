import { NextResponse } from "next/server";
import { getSessionUser } from "./getSessionUser";

export type AdminApiUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

function forbid(reason: "unauthenticated" | "disabled" | "forbidden"): NextResponse {
  const status = reason === "unauthenticated" ? 401 : 403;
  const code =
    reason === "unauthenticated" ? "UNAUTHENTICATED" :
    reason === "disabled" ? "ACCOUNT_DISABLED" :
    "FORBIDDEN";
  const message =
    reason === "unauthenticated" ? "Authentication required." :
    reason === "disabled" ? "This account is disabled." :
    "Admin access required.";
  return NextResponse.json({
    ok: false,
    error: {
      code,
      message,
    },
  }, { status });
}

export async function requireAdminApi(): Promise<AdminApiUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return forbid("unauthenticated");
  if (user.accountStatus !== "ACTIVE") return forbid("disabled");
  if (user.appRole !== "ADMIN" && user.appRole !== "SUPERADMIN") return forbid("forbidden");
  return user;
}
