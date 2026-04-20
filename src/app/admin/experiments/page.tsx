export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { listAdminSnapshot } from "@/lib/admin";
import { toPlain } from "@/lib/to-plain";
import { AdminExperimentsPageClient } from "@/components/admin/AdminExperimentsPageClient";

export default async function AdminExperimentsPage() {
  const viewer = await getViewer();
  if (!viewer || !["ADMIN", "SUPERADMIN"].includes(viewer.role)) redirect("/dashboard");
  const admin = listAdminSnapshot();
  return <AdminExperimentsPageClient experiments={toPlain(admin.experiments)} />;
}
