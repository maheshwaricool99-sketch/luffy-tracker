import { getSessionUser } from "@/lib/auth/getSessionUser";
import { getSignalById } from "@/lib/signals/queries/getSignalById";
import type { AppRole } from "@/lib/signals/types/signalEnums";

export const dynamic = "force-dynamic";

function resolveRole(user: Awaited<ReturnType<typeof getSessionUser>>): AppRole {
  if (!user) return "GUEST";
  return user.appRole;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  const role = resolveRole(user);
  const { id } = await params;
  const signal = await getSignalById(id, role, user?.id);
  if (!signal) return Response.json({ ok: false, message: "signal not found" }, { status: 404 });
  return Response.json(signal, { headers: { "Cache-Control": "no-store" } });
}
