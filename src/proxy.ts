import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = [
  "/",
  "/analysis",
  "/signals",
  "/performance",
  "/pricing",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/api/signals",
  "/api/performance",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/stripe/webhook",
  // `/health` and `/api/health` intentionally stay authenticated-only.
  // The operational dashboard is productized for signed-in members/operators,
  // while public trust messaging lives on public product pages.
] as const;

function secret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "local-dev-auth-secret";
}

let cachedKey: Promise<CryptoKey> | null = null;
function getHmacKey() {
  if (!cachedKey) {
    cachedKey = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
  }
  return cachedKey;
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    const byte = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) return null;
    out[i] = byte;
  }
  return out;
}

function bytesToHex(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let out = "";
  for (let i = 0; i < view.length; i += 1) out += view[i].toString(16).padStart(2, "0");
  return out;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySessionCookie(raw: string | undefined): Promise<string | null> {
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot <= 0 || dot === raw.length - 1) return null;
  const value = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  if (!hexToBytes(signature)) return null;
  const key = await getHmacKey();
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  const expected = bytesToHex(mac);
  return timingSafeEqualHex(expected, signature) ? value : null;
}

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never intercept Next internals, public assets, or file requests.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // API routes enforce auth and role checks at the handler level so callers get
  // JSON 401/403 responses instead of HTML login redirects.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // Public marketing/auth/free-signal routes stay available to guests.
  if (isPublic(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // All other surfaces require a verified signed session cookie.
  const session = await verifySessionCookie(request.cookies.get("signal_session")?.value);
  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Match all app routes while excluding static/image internals handled above.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
