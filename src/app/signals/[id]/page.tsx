export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { getSignalById } from "@/lib/signals/queries/getSignalById";
import type { AppRole } from "@/lib/signals/types/signalEnums";
import { SignalDetailPanel } from "@/components/signals/detail/SignalDetailPanel";

export default async function SignalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  const role: AppRole = user?.appRole ?? "GUEST";
  const { id } = await params;
  const signal = await getSignalById(id, role, user?.id);
  if (!signal) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <SignalDetailPanel signal={signal} role={role} />
    </div>
  );
}
