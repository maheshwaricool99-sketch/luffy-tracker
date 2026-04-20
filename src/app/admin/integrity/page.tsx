export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { getHealthSnapshot } from "@/lib/health/health-aggregator";
import { AdminIntegrityPageClient } from "@/components/admin/AdminIntegrityPageClient";

export default async function AdminIntegrityPage() {
  const viewer = await getViewer();
  if (!viewer || !["ADMIN", "SUPERADMIN"].includes(viewer.role)) redirect("/dashboard");
  const health = await getHealthSnapshot();
  return <AdminIntegrityPageClient health={health} />;
}
