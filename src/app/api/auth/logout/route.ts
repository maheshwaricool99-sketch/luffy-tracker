import { NextResponse } from "next/server";
import { destroyCurrentSession } from "@/lib/auth";
import { jsonOk, wantsJsonResponse } from "@/lib/http/response";

export async function POST(request: Request) {
  await destroyCurrentSession();
  const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  const host = request.headers.get("host") ?? new URL(request.url).host;
  const response = wantsJsonResponse(request)
    ? jsonOk({ redirectTo: "/login?message=Signed%20out" })
    : NextResponse.redirect(new URL("/login?message=Signed%20out", `${proto}://${host}`));
  response.cookies.set("signal_session", "", { path: "/", expires: new Date(0) });
  return response;
}
