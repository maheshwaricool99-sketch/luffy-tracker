export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { getMemberDetail, listMembers } from "@/lib/admin";
import { toPlain } from "@/lib/to-plain";
import { AdminMembersPageClient } from "@/components/admin/AdminMembersPageClient";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; role?: string; plan?: string; verification?: string; status?: string; subscriptionStatus?: string; userId?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer || !["ADMIN", "SUPERADMIN"].includes(viewer.role) || viewer.accountStatus !== "ACTIVE") redirect("/");
  const params = await searchParams;
  const members = listMembers({
    query: params.query,
    role: params.role,
    plan: params.plan,
    verification: params.verification,
    status: params.status,
    subscriptionStatus: params.subscriptionStatus,
  });
  const detail = params.userId ? getMemberDetail(params.userId) : null;

  return <AdminMembersPageClient viewer={viewer} members={toPlain(members)} detail={toPlain(detail)} initialFilters={toPlain(params)} />;
}
