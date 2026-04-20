export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { getHealthSnapshot } from "@/lib/health/health-aggregator";
import { listAdminSnapshot } from "@/lib/admin";
import { runtimeConfig } from "@/lib/runtime";
import { toPlain } from "@/lib/to-plain";
import { AdminSystemPageClient } from "@/components/admin/AdminSystemPageClient";

export default async function AdminSystemPage() {
  const viewer = await getSessionUser();
  if (!viewer || !["ADMIN", "SUPERADMIN"].includes(viewer.role) || viewer.accountStatus !== "ACTIVE") redirect("/");
  const [health, admin, runtime, runtimeAudit] = await Promise.all([
    getHealthSnapshot(),
    Promise.resolve(listAdminSnapshot()),
    runtimeConfig.getAll(true),
    runtimeConfig.getAuditLogs(25),
  ]);
  return <AdminSystemPageClient health={toPlain(health)} admin={toPlain(admin)} runtime={toPlain(runtime)} runtimeAudit={toPlain(runtimeAudit)} />;
}
