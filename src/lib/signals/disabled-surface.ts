export function disabledPublicRoute(message: string, status = 410) {
  return Response.json(
    {
      ok: false,
      message,
      terminalRoute: "/signals",
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
