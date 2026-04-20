import { NextResponse } from "next/server";

type Bucket = { count: number; windowStartMs: number };

const STORES = new Map<string, Map<string, Bucket>>();

function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

function bucketsFor(name: string): Map<string, Bucket> {
  let store = STORES.get(name);
  if (!store) {
    store = new Map();
    STORES.set(name, store);
  }
  return store;
}

export interface RateLimitOptions {
  name: string;
  windowMs: number;
  max: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function checkRateLimit(request: Request, opts: RateLimitOptions): RateLimitResult {
  const key = `${opts.name}:${clientIp(request)}`;
  const store = bucketsFor(opts.name);
  const now = Date.now();
  const bucket = store.get(key);
  if (!bucket || now - bucket.windowStartMs >= opts.windowMs) {
    store.set(key, { count: 1, windowStartMs: now });
    return { ok: true, remaining: opts.max - 1, retryAfterMs: 0 };
  }
  bucket.count += 1;
  if (bucket.count > opts.max) {
    return { ok: false, remaining: 0, retryAfterMs: opts.windowMs - (now - bucket.windowStartMs) };
  }
  return { ok: true, remaining: opts.max - bucket.count, retryAfterMs: 0 };
}

export function rateLimitOrForbidden(request: Request, opts: RateLimitOptions): NextResponse | null {
  const result = checkRateLimit(request, opts);
  if (result.ok) return null;
  return NextResponse.json(
    { error: { code: "RATE_LIMITED", message: "Too many attempts. Please wait before trying again." } },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
      },
    },
  );
}

export const AUTH_LIMITS = {
  login: { name: "auth.login", windowMs: 60_000, max: 5 },
  loginSlow: { name: "auth.login.slow", windowMs: 60 * 60_000, max: 50 },
  signup: { name: "auth.signup", windowMs: 60_000, max: 3 },
  signupSlow: { name: "auth.signup.slow", windowMs: 60 * 60_000, max: 15 },
  forgot: { name: "auth.forgot", windowMs: 60_000, max: 3 },
  forgotSlow: { name: "auth.forgot.slow", windowMs: 60 * 60_000, max: 15 },
  reset: { name: "auth.reset", windowMs: 60_000, max: 5 },
} as const;
