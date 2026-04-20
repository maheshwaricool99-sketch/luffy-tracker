import { NextResponse } from "next/server";
import { createUser, createSession } from "@/lib/auth";
import { publicAppUrl } from "@/lib/auth/publicAppUrl";
import { AUTH_LIMITS, rateLimitOrForbidden } from "@/lib/auth/rateLimit";
import { jsonError, jsonOk, wantsJsonResponse } from "@/lib/http/response";
import { toRuntimeErrorResponse } from "@/lib/runtime";

export async function POST(request: Request) {
  const limited = rateLimitOrForbidden(request, AUTH_LIMITS.signup) ?? rateLimitOrForbidden(request, AUTH_LIMITS.signupSlow);
  if (limited) {
    if (wantsJsonResponse(request)) {
      return jsonError(429, "RATE_LIMITED", "Too many signup attempts. Try again later.");
    }
    return NextResponse.redirect(`${publicAppUrl()}/signup?error=Too+many+signup+attempts.+Try+again+later.`);
  }
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const name = String(form.get("name") ?? "").trim();

  try {
    const userId = await createUser({ email, password, name: name || null });
    const session = await createSession(userId);
    if (wantsJsonResponse(request)) {
      const response = jsonOk({ redirectTo: "/intelligence" });
      response.cookies.set(session.cookieName, session.cookieValue, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: new Date(session.expiresAt),
      });
      return response;
    }
    const response = NextResponse.redirect(`${publicAppUrl()}/intelligence`);
    response.cookies.set(session.cookieName, session.cookieValue, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(session.expiresAt),
    });
    return response;
  } catch (error) {
    const runtimeError = toRuntimeErrorResponse(error);
    if (runtimeError) {
      if (wantsJsonResponse(request)) {
        return NextResponse.json(runtimeError.body, { status: runtimeError.status });
      }
      return NextResponse.redirect(`${publicAppUrl()}/signup?error=${encodeURIComponent(runtimeError.body.error.message)}`);
    }
    if (wantsJsonResponse(request)) {
      return jsonError(400, "SIGNUP_FAILED", error instanceof Error ? error.message : "Signup failed");
    }
    return NextResponse.redirect(`${publicAppUrl()}/signup?error=${encodeURIComponent(error instanceof Error ? error.message : "Signup failed")}`);
  }
}
