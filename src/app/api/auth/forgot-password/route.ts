import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/auth";
import { AUTH_LIMITS, rateLimitOrForbidden } from "@/lib/auth/rateLimit";

export async function POST(request: Request) {
  const limited = rateLimitOrForbidden(request, AUTH_LIMITS.forgot) ?? rateLimitOrForbidden(request, AUTH_LIMITS.forgotSlow);
  if (limited) {
    const url = new URL("/forgot-password", request.url);
    url.searchParams.set("error", "Too many requests. Try again later.");
    return NextResponse.redirect(url);
  }
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();

  try {
    const delivery = await sendPasswordResetEmail(email);
    const url = new URL("/forgot-password", request.url);
    url.searchParams.set("message", "If the account exists, a reset email has been issued.");
    if (delivery.previewUrl) url.searchParams.set("preview", delivery.previewUrl);
    return NextResponse.redirect(url);
  } catch (error) {
    const url = new URL("/forgot-password", request.url);
    url.searchParams.set("error", error instanceof Error ? error.message : "Reset failed");
    return NextResponse.redirect(url);
  }
}
