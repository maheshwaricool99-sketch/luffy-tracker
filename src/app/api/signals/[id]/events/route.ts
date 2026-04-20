import { getSessionUser } from "@/lib/auth/getSessionUser";
import { getSignalEvents } from "@/lib/signals/queries/getSignalEvents";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  return Response.json({ items: await getSignalEvents(id) });
}
