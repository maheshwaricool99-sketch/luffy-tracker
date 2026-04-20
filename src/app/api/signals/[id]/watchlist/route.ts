import { requireUser } from "@/lib/auth/requireUser";
import { withRuntimeGuard } from "@/lib/runtime";
import { createWatchlistItem } from "@/lib/signals/commands/createWatchlistItem";
import { removeWatchlistItem } from "@/lib/signals/commands/removeWatchlistItem";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  return withRuntimeGuard(() => createWatchlistItem(user.id, id));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  return withRuntimeGuard(() => removeWatchlistItem(user.id, id));
}
