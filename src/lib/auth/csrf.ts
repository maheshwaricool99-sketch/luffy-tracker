import { NextResponse } from "next/server";

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");
  if (!host) return false;

  const expectedHost = host.toLowerCase();
  if (origin) {
    try {
      return new URL(origin).host.toLowerCase() === expectedHost;
    } catch {
      return false;
    }
  }
  if (referer) {
    try {
      return new URL(referer).host.toLowerCase() === expectedHost;
    } catch {
      return false;
    }
  }
  return false;
}

export async function assertCsrfOrForbidden(request: Request): Promise<NextResponse | null> {
  if (sameOrigin(request)) return null;
  return NextResponse.json(
    { error: { code: "CSRF", message: "Cross-origin form submissions are not allowed." } },
    { status: 403 },
  );
}
