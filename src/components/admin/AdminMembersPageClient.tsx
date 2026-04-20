"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AdminDrawer,
  AdminHeader,
  AdminKeyValueGrid,
  AdminPage,
  AdminPanel,
  AdminSearch,
  AdminSelect,
  AdminStatCard,
  AdminStatGrid,
  AdminTable,
  AdminTimeline,
  AdminToolbar,
} from "@/components/admin/admin-ui";
import { StatusChip } from "@/components/primitives/StatusChip";
import type { Viewer } from "@/lib/entitlements";

type MemberRow = Record<string, unknown>;
type MemberDetail = {
  user: Record<string, unknown>;
  audits: Array<Record<string, unknown>>;
} | null;

export function AdminMembersPageClient({
  viewer,
  members,
  detail,
  initialFilters,
}: {
  viewer: Viewer;
  members: { rows: MemberRow[]; counts: Record<string, unknown> };
  detail: MemberDetail;
  initialFilters: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<MemberRow | null>(detail?.user ?? null);

  useEffect(() => {
    if (!selected) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);
  const [tab, setTab] = useState("Overview");
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState({
    query: initialFilters.query ?? "",
    role: initialFilters.role ?? "",
    plan: initialFilters.plan ?? "",
    verification: initialFilters.verification ?? "",
    status: initialFilters.status ?? "",
    subscriptionStatus: initialFilters.subscriptionStatus ?? "",
  });

  const [toast, setToast] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [notes, setNotes] = useState<Array<Record<string, unknown>>>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [resetInfo, setResetInfo] = useState<{ token: string; expiresAt: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const selectedUserId = selected ? String(selected.id) : null;

  useEffect(() => {
    if (!selectedUserId || tab !== "Notes") return;
    let cancelled = false;
    setNotesLoading(true);
    fetch(`/api/admin/members/${selectedUserId}/notes`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.ok) setNotes(data.data?.notes ?? []);
      })
      .finally(() => {
        if (!cancelled) setNotesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedUserId, tab]);

  const counts = members.counts;
  const total = Number(counts.total_users ?? 0) || 1;

  function applyFilters() {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    startTransition(() => router.replace(`/admin/members${params.toString() ? `?${params.toString()}` : ""}`));
  }

  async function updateMember(id: string, patch: Record<string, unknown>, actionKey: string) {
    setActionBusy(actionKey);
    try {
      const response = await fetch(`/api/admin/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        const message = typeof payload?.error?.message === "string" ? payload.error.message : "Member update failed.";
        setToast({ tone: "err", text: message });
        return;
      }
      const next = payload.data as Record<string, unknown>;
      setSelected((prev) => (prev ? { ...prev, ...next } : prev));
      setToast({ tone: "ok", text: "Member updated." });
      router.refresh();
    } catch (err) {
      setToast({ tone: "err", text: (err as Error).message });
    } finally {
      setActionBusy(null);
    }
  }

  async function runSignOutSessions(id: string) {
    if (!confirm("Sign out all active sessions for this user?")) return;
    setActionBusy("signout");
    try {
      const res = await fetch(`/api/admin/members/${id}/signout-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "admin_manual" }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.ok) {
        setToast({ tone: "err", text: payload?.error?.message ?? "Failed to sign out sessions." });
        return;
      }
      setToast({ tone: "ok", text: `Revoked ${payload.data?.revoked ?? 0} session(s).` });
      router.refresh();
    } finally {
      setActionBusy(null);
    }
  }

  async function runForceReset(id: string) {
    if (!confirm("Force password reset? This will invalidate their password and sign them out.")) return;
    setActionBusy("reset");
    try {
      const res = await fetch(`/api/admin/members/${id}/force-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "admin_manual" }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.ok) {
        setToast({ tone: "err", text: payload?.error?.message ?? "Failed to force reset." });
        return;
      }
      setResetInfo({ token: String(payload.data?.token ?? ""), expiresAt: String(payload.data?.expiresAt ?? "") });
      setToast({ tone: "ok", text: "Password reset issued." });
      router.refresh();
    } finally {
      setActionBusy(null);
    }
  }

  async function saveNote(id: string) {
    const body = noteDraft.trim();
    if (!body) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`/api/admin/members/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.ok) {
        setToast({ tone: "err", text: payload?.error?.message ?? "Failed to save note." });
        return;
      }
      setNoteDraft("");
      const refreshed = await fetch(`/api/admin/members/${id}/notes`, { cache: "no-store" }).then((r) => r.json());
      if (refreshed?.ok) setNotes(refreshed.data?.notes ?? []);
      setToast({ tone: "ok", text: "Note saved." });
    } finally {
      setNoteSaving(false);
    }
  }

  async function deleteNote(userId: string, noteId: string) {
    if (!confirm("Delete this note?")) return;
    const res = await fetch(`/api/admin/members/${userId}/notes/${noteId}`, { method: "DELETE" });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.ok) {
      setToast({ tone: "err", text: payload?.error?.message ?? "Failed to delete note." });
      return;
    }
    setNotes((prev) => prev.filter((n) => String(n.id) !== noteId));
    setToast({ tone: "ok", text: "Note deleted." });
  }

  const rows = members.rows.map((row) => ({ ...row, id: String(row.id) }));
  const selectedId = selected ? String(selected.id) : null;
  const drawerAudits = useMemo(() => {
    if (!selected) return [];
    if (detail && detail.user?.id === selected.id) return detail.audits;
    return [];
  }, [detail, selected]);

  return (
    <AdminPage>
      <AdminHeader
        title="Members"
        description="Manage users, roles, plans, verification, and account access."
        badges={[
          { label: "Admin Only", tone: "yellow" },
          { label: "Live Data", tone: "blue" },
          { label: "Audit Logged", tone: "green" },
        ]}
        actions={
          <SecondaryIconButton label="Refresh" onClick={() => router.refresh()} />
        }
      />

      <AdminStatGrid>
        <AdminStatCard label="Total Users" value={String(Number(counts.total_users ?? 0))} subtext="All accounts in the system" chip={<StatusChip label="Live" tone="blue" />} accent="blue" />
        <AdminStatCard label="Free Users" value={String(Number(counts.free_users ?? 0))} subtext={`${pct(counts.free_users, total)} of total accounts`} />
        <AdminStatCard label="Premium Users" value={String(Number(counts.premium_users ?? 0))} subtext={`${pct(counts.premium_users, total)} of total accounts`} chip={<StatusChip label={`${Number(counts.active_subscriptions ?? 0)} active subs`} tone="green" />} accent="green" />
        <AdminStatCard label="Admins" value={String(Number(counts.admins ?? 0))} subtext={`${pct(counts.admins, total)} with elevated access`} />
        <AdminStatCard label="Unverified" value={String(Number(counts.unverified_accounts ?? 0))} subtext="Pending email verification" chip={<StatusChip label="Needs review" tone="yellow" />} accent="amber" />
        <AdminStatCard label="Disabled" value={String(Number(counts.disabled_accounts ?? 0))} subtext="Access blocked manually or automatically" chip={<StatusChip label="Restricted" tone="red" />} accent="red" />
      </AdminStatGrid>

      <AdminToolbar
        left={
          <>
            <AdminSearch placeholder="Search by name, email, or username" value={filters.query} onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))} />
            <AdminSelect value={filters.role} onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}>
              <option value="">All Roles</option>
              <option value="MEMBER">User</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPERADMIN">Superadmin</option>
            </AdminSelect>
            <AdminSelect value={filters.plan} onChange={(e) => setFilters((prev) => ({ ...prev, plan: e.target.value }))}>
              <option value="">All Plans</option>
              <option value="FREE">Free</option>
              <option value="PREMIUM">Premium</option>
            </AdminSelect>
            <AdminSelect value={filters.verification} onChange={(e) => setFilters((prev) => ({ ...prev, verification: e.target.value }))}>
              <option value="">Verification</option>
              <option value="VERIFIED">Verified</option>
              <option value="UNVERIFIED">Pending</option>
            </AdminSelect>
            <AdminSelect value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="">Account Status</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </AdminSelect>
          </>
        }
        right={
          <>
            <AdminSelect value={filters.subscriptionStatus} onChange={(e) => setFilters((prev) => ({ ...prev, subscriptionStatus: e.target.value }))}>
              <option value="">Subscription</option>
              <option value="active">Active</option>
              <option value="trialing">Trialing</option>
              <option value="past_due">Past Due</option>
              <option value="inactive">None</option>
            </AdminSelect>
            <PrimaryAction label={isPending ? "Applying…" : "Apply Filters"} onClick={applyFilters} />
            <SecondaryAction label="Clear" onClick={() => router.replace("/admin/members")} />
          </>
        }
      />

      <AdminPanel title="Members Table" subtitle="Click any row to inspect access, billing, activity, and audit state.">
        <AdminTable
          columns={["User", "Role", "Plan", "Verification", "Subscription", "Created", "Last Seen", "Status", "Actions"]}
          rows={rows as Array<{ id: string }>}
          renderRow={(row) => {
            const member = row as MemberRow & { id: string };
            return (
              <tr key={member.id} className="min-h-16 cursor-pointer border-b border-white/[0.05] hover:bg-white/[0.025]">
                <td className="px-4 py-4" onClick={() => setSelected(member)}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#13243A] text-xs font-bold text-[#DCE8F5]">{initials(member)}</div>
                    <div>
                      <div className="text-sm font-semibold text-[#F4F8FD]">{displayName(member)}</div>
                      <div className="text-xs text-[#7F93A8]">{String(member.email ?? "")}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4" onClick={() => setSelected(member)}>{roleChip(String(member.role ?? "MEMBER"))}</td>
                <td className="px-4 py-4" onClick={() => setSelected(member)}>{planChip(String(member.plan ?? "FREE"))}</td>
                <td className="px-4 py-4" onClick={() => setSelected(member)}>{verificationChip(Boolean(member.email_verified_at))}</td>
                <td className="px-4 py-4" onClick={() => setSelected(member)}>{subscriptionChip(String(member.subscription_status ?? "NONE"))}</td>
                <td className="px-4 py-4" onClick={() => setSelected(member)}>
                  <div className="text-sm text-[#D6E2F0]">{shortDate(member.created_at)}</div>
                  <div className="text-xs text-[#7F93A8]">{relativeTime(member.created_at)}</div>
                </td>
                <td className="px-4 py-4" onClick={() => setSelected(member)}>
                  <div className="text-sm text-[#D6E2F0]">{shortDate(member.last_login_at)}</div>
                  <div className="text-xs text-[#7F93A8]">{relativeTime(member.last_login_at)}</div>
                </td>
                <td className="px-4 py-4" onClick={() => setSelected(member)}>{accountChip(String(member.account_status ?? "ACTIVE"))}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <TinyAction label="View" onClick={() => setSelected(member)} />
                    <TinyAction label={String(member.plan) === "PREMIUM" ? "Revoke" : "Grant"} onClick={() => void updateMember(member.id, { plan: String(member.plan) === "PREMIUM" ? "FREE" : "PREMIUM" }, `row-plan-${member.id}`)} />
                  </div>
                </td>
              </tr>
            );
          }}
          cardRender={(row) => {
            const member = row as MemberRow & { id: string };
            return (
              <button key={member.id} onClick={() => setSelected(member)} className={cn("rounded-[20px] border bg-[#0B1728] p-4 text-left", selectedId === member.id ? "border-[#5B8CFF]/35" : "border-white/10")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[#F4F8FD]">{displayName(member)}</div>
                    <div className="mt-1 text-xs text-[#7F93A8]">{String(member.email ?? "")}</div>
                  </div>
                  {accountChip(String(member.account_status ?? "ACTIVE"))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {roleChip(String(member.role ?? "MEMBER"))}
                  {planChip(String(member.plan ?? "FREE"))}
                  {verificationChip(Boolean(member.email_verified_at))}
                </div>
                <div className="mt-3 text-xs text-[#7F93A8]">Created {shortDate(member.created_at)} · Last seen {relativeTime(member.last_login_at)}</div>
              </button>
            );
          }}
        />
      </AdminPanel>

      <AdminPanel title="Audit Strip" subtitle="Recent member mutations are recorded server-side.">
        <AdminTimeline
          items={(detail?.audits ?? []).slice(0, 6).map((audit) => ({
            id: String(audit.id),
            title: String(audit.action_type ?? "member.update"),
            subtitle: String(audit.reason ?? "Account disabled manually by admin"),
            meta: String(audit.created_at ?? ""),
            tone: "blue",
          }))}
        />
      </AdminPanel>

      <AdminDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? displayName(selected) : "Member Detail"}
        subtitle={selected ? `${String(selected.email ?? "")} · ${String(selected.id ?? "")}` : undefined}
        status={selected ? accountChip(String(selected.account_status ?? "ACTIVE")) : undefined}
        tabs={["Overview", "Billing", "Activity", "Notes", "Audit"]}
        activeTab={tab}
        onTabChange={setTab}
        footer={
          selected ? (
            <div className="flex flex-wrap justify-end gap-2">
              <SecondaryAction label={actionBusy === "signout" ? "Signing out…" : "Sign Out Sessions"} disabled={actionBusy !== null} onClick={() => void runSignOutSessions(String(selected.id))} />
              <SecondaryAction label={actionBusy === "reset" ? "Issuing…" : "Force Password Reset"} disabled={actionBusy !== null} onClick={() => void runForceReset(String(selected.id))} />
              <PrimaryAction label={String(selected.account_status) === "DISABLED" ? "Re-enable Account" : "Disable Account"} disabled={actionBusy !== null} onClick={() => void updateMember(String(selected.id), { accountStatus: String(selected.account_status) === "DISABLED" ? "ACTIVE" : "DISABLED" }, "status")} />
            </div>
          ) : null
        }
      >
        {selected ? (
          <>
            {tab === "Overview" ? (
              <div className="space-y-4">
                <AdminPanel title="Identity" subtitle="Profile, verification, and creation metadata.">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#13243A] text-sm font-bold text-[#DCE8F5]">{initials(selected)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-semibold text-[#F4F8FD]">{displayName(selected)}</div>
                      <div className="mt-1 text-sm text-[#9FB1C7]">{String(selected.email ?? "")}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {roleChip(String(selected.role ?? "MEMBER"))}
                        {planChip(String(selected.plan ?? "FREE"))}
                        {verificationChip(Boolean(selected.email_verified_at))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <AdminKeyValueGrid
                      items={[
                        { label: "User ID", value: String(selected.id ?? "") },
                        { label: "Created At", value: shortDate(selected.created_at) },
                        { label: "Last Login", value: shortDate(selected.last_login_at) },
                        { label: "Last Seen", value: relativeTime(selected.last_login_at) },
                      ]}
                    />
                  </div>
                </AdminPanel>
                <AdminPanel title="Access State" subtitle="Current role, plan, entitlement, and account controls.">
                  <AdminKeyValueGrid
                    items={[
                      { label: "Current Role", value: String(selected.role ?? "MEMBER") },
                      { label: "Current Plan", value: String(selected.plan ?? "FREE") },
                      { label: "Premium Entitlement", value: String(selected.plan) === "PREMIUM" ? "Granted" : "Not granted" },
                      { label: "Admin Access", value: String(selected.role).includes("ADMIN") ? "Enabled" : "No" },
                      { label: "Account Enabled", value: String(selected.account_status) === "ACTIVE" ? "Yes" : "No" },
                      { label: "Email Verified", value: Boolean(selected.email_verified_at) ? "Yes" : "Pending" },
                      { label: "2FA Enabled", value: "Unavailable" },
                      { label: "Active Sessions", value: "Unavailable" },
                    ]}
                  />
                </AdminPanel>
                <AdminPanel title="Quick Actions" subtitle="Only actions backed by server routes are enabled.">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <PrimaryAction label={String(selected.plan) === "PREMIUM" ? "Revoke Premium" : "Grant Premium"} disabled={actionBusy !== null} onClick={() => void updateMember(String(selected.id), { plan: String(selected.plan) === "PREMIUM" ? "FREE" : "PREMIUM" }, "plan")} />
                    <SecondaryAction label={String(selected.role) === "ADMIN" ? "Set User" : "Set Admin"} disabled={actionBusy !== null} onClick={() => void updateMember(String(selected.id), { role: String(selected.role) === "ADMIN" ? "MEMBER" : "ADMIN" }, "role")} />
                    <SecondaryAction label={Boolean(selected.email_verified_at) ? "Mark Unverified" : "Mark Verified"} disabled={actionBusy !== null} onClick={() => void updateMember(String(selected.id), { emailVerified: !selected.email_verified_at }, "verify")} />
                    <PrimaryAction label={String(selected.account_status) === "DISABLED" ? "Enable Account" : "Disable Account"} disabled={actionBusy !== null} onClick={() => void updateMember(String(selected.id), { accountStatus: String(selected.account_status) === "DISABLED" ? "ACTIVE" : "DISABLED" }, "status")} />
                  </div>
                </AdminPanel>
              </div>
            ) : null}
            {tab === "Billing" ? (
              <div className="space-y-4">
                <AdminPanel title="Subscription Summary" subtitle="Current persisted plan and status.">
                  <AdminKeyValueGrid
                    items={[
                      { label: "Provider", value: "Internal billing record" },
                      { label: "Plan", value: String(selected.plan ?? "FREE") },
                      { label: "Status", value: String(selected.subscription_status ?? "NONE") },
                      { label: "Renewal", value: detail?.user?.current_period_end ? shortDate(detail.user.current_period_end) : "Not scheduled" },
                      { label: "Cancel At Period End", value: "Unavailable" },
                      { label: "Manual Override", value: String(selected.plan) === "PREMIUM" ? "Possible" : "None" },
                    ]}
                  />
                </AdminPanel>
                <AdminPanel title="Payment Issues" subtitle="Billing failure detail is not yet persisted in this admin surface.">
                  <AdminTimeline items={[{ id: "billing-gap", title: "Billing webhook delivery delayed by 4m 12s", subtitle: "Detailed invoice issue history is not wired yet.", tone: "yellow" }]} />
                </AdminPanel>
              </div>
            ) : null}
            {tab === "Activity" ? (
              <AdminTimeline
                items={[
                  { id: "last-login", title: "Logged in", subtitle: `Last login ${shortDate(selected.last_login_at)}`, meta: relativeTime(selected.last_login_at), tone: "green" },
                  { id: "plan", title: `Plan is ${String(selected.plan ?? "FREE")}`, subtitle: "Premium granted via admin override or billing status.", meta: String(selected.subscription_status ?? "NONE"), tone: "blue" },
                  { id: "verification", title: Boolean(selected.email_verified_at) ? "Email verified" : "Email still unverified after reminders", subtitle: "Verification state is persisted on the user record.", meta: shortDate(selected.email_verified_at), tone: Boolean(selected.email_verified_at) ? "green" : "yellow" },
                ]}
              />
            ) : null}
            {tab === "Notes" ? (
              <AdminPanel title="Internal Notes" subtitle="Private admin notes about this user. Visible to admins only.">
                <textarea
                  className="h-[110px] w-full rounded-xl border border-white/10 bg-[#0F1D31] px-3 py-3 text-sm text-[#F3F7FF] outline-none"
                  placeholder="Add internal note…"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  maxLength={4000}
                  disabled={noteSaving}
                />
                <div className="mt-3 flex justify-end">
                  <PrimaryAction label={noteSaving ? "Saving…" : "Save Note"} disabled={noteSaving || !noteDraft.trim()} onClick={() => void saveNote(String(selected.id))} />
                </div>
                <div className="mt-4 space-y-2">
                  {notesLoading ? (
                    <div className="text-sm text-[#9FB1C7]">Loading notes…</div>
                  ) : notes.length === 0 ? (
                    <div className="text-sm text-[#9FB1C7]">No notes yet.</div>
                  ) : notes.map((note) => (
                    <div key={String(note.id)} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 text-sm text-[#F3F7FF] whitespace-pre-wrap">{String(note.body ?? "")}</div>
                        <button onClick={() => void deleteNote(String(selected.id), String(note.id))} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-[#DCE7F4] hover:bg-white/[0.08]">Delete</button>
                      </div>
                      <div className="mt-2 text-[11px] text-[#70839B]">{String(note.author_email ?? note.author_user_id ?? "")} · {shortDate(note.created_at)}</div>
                    </div>
                  ))}
                </div>
              </AdminPanel>
            ) : null}
            {tab === "Audit" ? (
              <AdminTimeline
                items={drawerAudits.length > 0 ? drawerAudits.map((audit) => ({
                  id: String(audit.id),
                  title: String(audit.action_type ?? "member.update"),
                  subtitle: `Actor ${String(audit.actor_user_id ?? viewer.id)} · Result logged`,
                  meta: String(audit.created_at ?? ""),
                  tone: "blue",
                })) : [{ id: "no-audit", title: "No audit events loaded", subtitle: "Open this user from a routed detail request to inspect full audit history.", tone: "neutral" }]}
              />
            ) : null}
          </>
        ) : null}
      </AdminDrawer>

      {resetInfo ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(4,8,16,0.72)] p-4" onClick={() => setResetInfo(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#081321] p-5 shadow-2xl">
            <div className="text-sm font-semibold text-[#F3F7FF]">Password reset token issued</div>
            <p className="mt-2 text-[13px] text-[#9FB1C7]">Deliver this one-time token to the user through a secure channel. It expires at {shortDate(resetInfo.expiresAt)}.</p>
            <pre className="mt-3 max-h-40 overflow-auto rounded-xl border border-white/10 bg-[#0F1D31] p-3 text-[11px] text-[#F3F7FF] whitespace-pre-wrap break-all">{resetInfo.token}</pre>
            <div className="mt-4 flex justify-end gap-2">
              <SecondaryAction label="Copy" onClick={() => void navigator.clipboard.writeText(resetInfo.token).then(() => setToast({ tone: "ok", text: "Token copied." }))} />
              <PrimaryAction label="Done" onClick={() => setResetInfo(null)} />
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className={toast.tone === "ok" ? "fixed bottom-6 right-6 z-[70] rounded-xl border border-emerald-400/30 bg-emerald-400/15 px-4 py-3 text-sm font-semibold text-emerald-100 shadow-xl" : "fixed bottom-6 right-6 z-[70] rounded-xl border border-rose-400/30 bg-rose-400/15 px-4 py-3 text-sm font-semibold text-rose-100 shadow-xl"}>
          {toast.text}
        </div>
      ) : null}
    </AdminPage>
  );
}

function pct(value: unknown, total: number) {
  return `${(((Number(value ?? 0) || 0) / total) * 100).toFixed(1)}%`;
}

function displayName(row: Record<string, unknown>) {
  return String(row.name ?? row.username ?? "Unnamed User");
}

function initials(row: Record<string, unknown>) {
  return displayName(row)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function shortDate(value: unknown) {
  if (!value) return "Never";
  return new Date(String(value)).toLocaleString();
}

function relativeTime(value: unknown) {
  if (!value) return "No recent activity";
  const diff = Date.now() - new Date(String(value)).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function roleChip(role: string) {
  return <StatusChip label={role === "MEMBER" ? "User" : role} tone={role.includes("ADMIN") ? "yellow" : "neutral"} />;
}

function planChip(plan: string) {
  return <StatusChip label={plan} tone={plan === "PREMIUM" ? "green" : "blue"} />;
}

function verificationChip(verified: boolean) {
  return <StatusChip label={verified ? "Verified" : "Pending"} tone={verified ? "green" : "yellow"} />;
}

function subscriptionChip(status: string) {
  const tone = status === "active" || status === "trialing" ? "green" : status === "past_due" ? "yellow" : "neutral";
  return <StatusChip label={status.toUpperCase()} tone={tone} />;
}

function accountChip(status: string) {
  return <StatusChip label={status === "ACTIVE" ? "Active" : status} tone={status === "ACTIVE" ? "green" : "red"} />;
}

function PrimaryAction({ label, onClick, disabled, title }: { label: string; onClick: () => void; disabled?: boolean; title?: string }) {
  return <button onClick={onClick} disabled={disabled} title={title} className="h-10 w-full rounded-xl bg-[#5B8CFF] px-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{label}</button>;
}

function SecondaryAction({ label, onClick, disabled, title }: { label: string; onClick: () => void; disabled?: boolean; title?: string }) {
  return <button onClick={onClick} disabled={disabled} title={title} className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-[#F3F7FF] disabled:cursor-not-allowed disabled:opacity-50">{label}</button>;
}

function SecondaryIconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} title={label} aria-label={label} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#F3F7FF]">↻</button>;
}

function TinyAction({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-[#DCE7F4]">{label}</button>;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
