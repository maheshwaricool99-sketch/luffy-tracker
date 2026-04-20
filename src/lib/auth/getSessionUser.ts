import { cache } from "react";
import { getViewer } from "@/lib/auth";
import type { AppRole } from "@/lib/signals/types/signalEnums";

export const getSessionUser = cache(async () => {
  const viewer = await getViewer();
  if (!viewer) return null;

  const role: AppRole =
    viewer.role === "SUPERADMIN" ? "SUPERADMIN" :
    viewer.role === "ADMIN" ? "ADMIN" :
    viewer.subscription?.plan === "PREMIUM" ? "PREMIUM" :
    "FREE";

  return { ...viewer, appRole: role };
});
