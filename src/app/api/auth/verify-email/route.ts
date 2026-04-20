import { NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/auth";
import { publicAppUrl } from "@/lib/auth/publicAppUrl";

export async function POST(request: Request) {
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  const ok = verifyEmailToken(token);
  if (ok) {
    return NextResponse.redirect(`${publicAppUrl()}/login?next=/intelligence&message=${encodeURIComponent("Email verified. You can sign in now.")}`);
  }
  return NextResponse.redirect(`${publicAppUrl()}/verify-email?error=${encodeURIComponent("Verification token is invalid or expired")}`);
}
