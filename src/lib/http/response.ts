import { NextResponse } from "next/server";

export class AppRouteError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppRouteError";
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({
    ok: false,
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  }, { status });
}

export function wantsJsonResponse(request: Request) {
  const accept = request.headers.get("accept") ?? "";
  const contentType = request.headers.get("content-type") ?? "";
  return accept.includes("application/json") || contentType.includes("application/json");
}
