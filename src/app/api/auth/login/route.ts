import { NextResponse } from "next/server";
import { authenticateUser, createSession } from "@/lib/auth";
import { publicAppUrl } from "@/lib/auth/publicAppUrl";
import { AUTH_LIMITS, rateLimitOrForbidden } from "@/lib/auth/rateLimit";
import { jsonError, jsonOk, wantsJsonResponse } from "@/lib/http/response";

export async function POST(request: Request) {
  const limited = rateLimitOrForbidden(request, AUTH_LIMITS.login) ?? rateLimitOrForbidden(request, AUTH_LIMITS.loginSlow);
  if (limited) {
    if (wantsJsonResponse(request)) {
      return jsonError(429, "RATE_LIMITED", "Too many attempts. Wait a minute and try again.");
    }
    return NextResponse.redirect(`${publicAppUrl()}/login?error=Too+many+attempts.+Wait+a+minute+and+try+again.`);
  }

  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/intelligence");

  try {
    const viewer = await authenticateUser(email, password);
    const session = await createSession(viewer.id);
    const redirectTo = next.startsWith("/") ? next : "/intelligence";
    const response = wantsJsonResponse(request)
      ? jsonOk({ redirectTo })
      : NextResponse.redirect(`${publicAppUrl()}${redirectTo}`);
    response.cookies.set(session.cookieName, session.cookieValue, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(session.expiresAt),
    });
    return response;
  } catch (error) {
    if (wantsJsonResponse(request)) {
      return jsonError(401, "INVALID_CREDENTIALS", error instanceof Error ? error.message : "Login failed");
    }
    return NextResponse.redirect(`${publicAppUrl()}/login?error=${encodeURIComponent(error instanceof Error ? error.message : "Login failed")}`);
  }
}
