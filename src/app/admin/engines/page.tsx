export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { toPlain } from "@/lib/to-plain";
import { computeEngineStatus } from "@/server/engines/engine-status";
import { listEngineAuditEvents } from "@/server/engines/engine-audit";
import { EngineControlClient } from "@/components/admin/engines/EngineControlClient";

export default async function AdminEnginesPage() {
  const viewer = await getSessionUser();
  if (!viewer || !["ADMIN", "SUPERADMIN"].includes(viewer.role) || viewer.accountStatus !== "ACTIVE") {
    redirect("/");
  }

  const status = computeEngineStatus();
  const priceAudit = listEngineAuditEvents("price", 8);
  const executionAudit = listEngineAuditEvents("execution", 8);

  return (
    <EngineControlClient
      initialStatus={toPlain(status)}
      initialPriceAudit={toPlain(priceAudit)}
      initialExecutionAudit={toPlain(executionAudit)}
    />
  );
}
