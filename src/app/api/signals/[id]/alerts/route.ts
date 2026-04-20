import { requirePremium } from "@/lib/auth/requirePremium";
import { withRuntimeGuard } from "@/lib/runtime";
import { createSignalAlert } from "@/lib/signals/commands/createSignalAlert";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePremium();
  const { id } = await params;
  const body = await request.json();
  return withRuntimeGuard(() => createSignalAlert(user.id, id, String(body.channel ?? "IN_APP"), String(body.triggerType ?? "TRIGGERED")));
}
