export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { getHealthSnapshot } from "@/lib/health/health-aggregator";
import { AdminScannersPageClient } from "@/components/admin/AdminScannersPageClient";

export default async function AdminScannersPage() {
  const viewer = await getViewer();
  if (!viewer || !["ADMIN", "SUPERADMIN"].includes(viewer.role) || viewer.accountStatus !== "ACTIVE") redirect("/");
  const health = await getHealthSnapshot();
  return <AdminScannersPageClient health={health} />;
}
