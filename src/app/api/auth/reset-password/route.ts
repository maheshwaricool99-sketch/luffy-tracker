import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/auth";
import { publicAppUrl } from "@/lib/auth/publicAppUrl";
import { AUTH_LIMITS, rateLimitOrForbidden } from "@/lib/auth/rateLimit";

export async function POST(request: Request) {
  const limited = rateLimitOrForbidden(request, AUTH_LIMITS.reset);
  if (limited) {
    return NextResponse.redirect(`${publicAppUrl()}/reset-password?error=Too+many+attempts.+Wait+a+minute+and+try+again.`);
  }
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const ok = resetPasswordWithToken(token, password);
  if (ok) {
    return NextResponse.redirect(`${publicAppUrl()}/login?message=${encodeURIComponent("Password updated. Sign in with the new password.")}`);
  }
  return NextResponse.redirect(`${publicAppUrl()}/reset-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent("Reset token is invalid or expired")}`);
}
