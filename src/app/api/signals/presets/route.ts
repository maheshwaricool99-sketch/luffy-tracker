import { requireUser } from "@/lib/auth/requireUser";
import { withRuntimeGuard } from "@/lib/runtime";
import { saveFilterPreset } from "@/lib/signals/commands/saveFilterPreset";
import { getSavedPresets } from "@/lib/signals/queries/getSavedPresets";

export async function GET() {
  const user = await requireUser();
  return Response.json({ items: await getSavedPresets(user.id) });
}

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.json();
  return withRuntimeGuard(() => saveFilterPreset(user.id, String(body.name ?? "Preset"), body.filterConfig ?? {}, Boolean(body.isDefault)));
}
