import { createHash, randomUUID } from "node:crypto";
import { getDb, nowIso, parseJson } from "@/lib/db";
import type { Viewer } from "@/lib/entitlements";
import { AppRouteError } from "@/lib/http/response";
import { assertRole } from "@/lib/permissions";
import { assertWritableOrThrow, readRuntimeFlagsSnapshot } from "@/lib/runtime";

function recordAction(actor: Viewer, action: string, target: string, payload: Record<string, unknown>) {
  getDb().prepare(`
    INSERT INTO admin_actions (id, actor_user_id, action, target, payload_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), actor.id, action, target, JSON.stringify(payload), nowIso());
}

function recordAudit(actor: Viewer, input: {
  targetUserId?: string | null;
  actionType: string;
  entityType: string;
  entityId?: string | null;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  reason?: string | null;
}) {
  getDb().prepare(`
    INSERT INTO admin_audit_logs (
      id, actor_user_id, target_user_id, action_type, entity_type, entity_id, before_json, after_json, reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    actor.id,
    input.targetUserId ?? null,
    input.actionType,
    input.entityType,
    input.entityId ?? null,
    JSON.stringify(input.before),
    JSON.stringify(input.after),
    input.reason ?? null,
    nowIso(),
  );
}

function countActiveAdmins(excludingUserId?: string) {
  const db = getDb();
  if (excludingUserId) {
    const row = db.prepare(`
      SELECT COUNT(*) AS total
      FROM users
      WHERE role IN ('ADMIN', 'SUPERADMIN')
        AND account_status = 'ACTIVE'
        AND id != ?
    `).get(excludingUserId) as { total?: number } | undefined;
    return Number(row?.total ?? 0);
  }

  const row = db.prepare(`
    SELECT COUNT(*) AS total
    FROM users
    WHERE role IN ('ADMIN', 'SUPERADMIN')
      AND account_status = 'ACTIVE'
  `).get() as { total?: number } | undefined;
  return Number(row?.total ?? 0);
}

export function listAdminSnapshot() {
  const db = getDb();
  return {
    markets: db.prepare("SELECT * FROM admin_market_controls ORDER BY market ASC").all() as Array<Record<string, unknown>>,
    models: db.prepare("SELECT * FROM admin_model_controls ORDER BY model ASC").all() as Array<Record<string, unknown>>,
    experiments: db.prepare("SELECT * FROM feature_flags ORDER BY key ASC").all() as Array<Record<string, unknown>>,
    incidents: db.prepare("SELECT * FROM admin_incidents ORDER BY updated_at DESC").all() as Array<Record<string, unknown>>,
    actions: db.prepare("SELECT * FROM admin_actions ORDER BY created_at DESC LIMIT 100").all() as Array<Record<string, unknown>>,
    audits: db.prepare("SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 200").all() as Array<Record<string, unknown>>,
  };
}

export function listMembers(filters: {
  query?: string;
  role?: string;
  plan?: string;
  verification?: string;
  status?: string;
  subscriptionStatus?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDb();
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.query) {
    where.push("(lower(users.email) LIKE ? OR lower(coalesce(users.name, '')) LIKE ? OR lower(coalesce(users.username, '')) LIKE ?)");
    const q = `%${filters.query.toLowerCase()}%`;
    params.push(q, q, q);
  }
  if (filters.role) {
    where.push("users.role = ?");
    params.push(filters.role);
  }
  if (filters.plan) {
    where.push("coalesce(subscriptions.plan, 'FREE') = ?");
    params.push(filters.plan);
  }
  if (filters.verification === "VERIFIED") where.push("users.email_verified_at IS NOT NULL");
  if (filters.verification === "UNVERIFIED") where.push("users.email_verified_at IS NULL");
  if (filters.status) {
    where.push("users.account_status = ?");
    params.push(filters.status);
  }
  if (filters.subscriptionStatus) {
    where.push("coalesce(subscriptions.status, 'NONE') = ?");
    params.push(filters.subscriptionStatus);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const limit = Math.max(1, Math.min(filters.limit ?? 50, 100));
  const offset = Math.max(0, filters.offset ?? 0);

  const rows = db.prepare(`
    SELECT
      users.id,
      users.username,
      users.name,
      users.email,
      users.role,
      users.account_status,
      users.email_verified_at,
      users.created_at,
      users.last_login_at,
      coalesce(subscriptions.plan, 'FREE') AS plan,
      coalesce(subscriptions.status, 'NONE') AS subscription_status
    FROM users
    LEFT JOIN subscriptions ON subscriptions.user_id = users.id
    ${whereSql}
    ORDER BY users.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Array<Record<string, unknown>>;

  const counts = db.prepare(`
    SELECT
      COUNT(*) AS total_users,
      SUM(CASE WHEN coalesce(subscriptions.plan, 'FREE') = 'FREE' THEN 1 ELSE 0 END) AS free_users,
      SUM(CASE WHEN subscriptions.plan = 'PREMIUM' THEN 1 ELSE 0 END) AS premium_users,
      SUM(CASE WHEN users.role IN ('ADMIN', 'SUPERADMIN') THEN 1 ELSE 0 END) AS admins,
      SUM(CASE WHEN users.account_status = 'DISABLED' THEN 1 ELSE 0 END) AS disabled_accounts,
      SUM(CASE WHEN users.email_verified_at IS NULL THEN 1 ELSE 0 END) AS unverified_accounts,
      SUM(CASE WHEN subscriptions.status IN ('active', 'trialing', 'past_due') THEN 1 ELSE 0 END) AS active_subscriptions
    FROM users
    LEFT JOIN subscriptions ON subscriptions.user_id = users.id
  `).get() as Record<string, unknown>;

  return { rows, counts };
}

export function getMemberDetail(userId: string) {
  const db = getDb();
  const user = db.prepare(`
    SELECT
      users.id,
      users.username,
      users.name,
      users.email,
      users.role,
      users.account_status,
      users.email_verified_at,
      users.created_at,
      users.updated_at,
      users.last_login_at,
      coalesce(subscriptions.plan, 'FREE') AS plan,
      coalesce(subscriptions.status, 'NONE') AS subscription_status,
      subscriptions.current_period_end
    FROM users
    LEFT JOIN subscriptions ON subscriptions.user_id = users.id
    WHERE users.id = ?
  `).get(userId) as Record<string, unknown> | undefined;

  if (!user) return null;

  const audits = db.prepare(`
    SELECT * FROM admin_audit_logs
    WHERE target_user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(userId) as Array<Record<string, unknown>>;

  return { user, audits };
}

export function adminUpdateMember(actor: Viewer, input: {
  targetUserId: string;
  plan?: "FREE" | "PREMIUM";
  role?: "MEMBER" | "ADMIN";
  accountStatus?: "ACTIVE" | "DISABLED";
  emailVerified?: boolean;
  reason?: string;
}) {
  assertRole(actor.role, "ADMIN");
  assertWritableOrThrow(readRuntimeFlagsSnapshot().flags);
  const db = getDb();
  const before = db.prepare(`
    SELECT
      users.id,
      users.role,
      users.account_status,
      coalesce(subscriptions.plan, 'FREE') AS plan,
      coalesce(subscriptions.status, 'NONE') AS subscription_status
    FROM users
    LEFT JOIN subscriptions ON subscriptions.user_id = users.id
    WHERE users.id = ?
  `).get(input.targetUserId) as Record<string, unknown> | undefined;

  if (!before) throw new AppRouteError("USER_NOT_FOUND", 404, "User not found.");

  const currentRole = String(before.role ?? "MEMBER");
  const currentAccountStatus = String(before.account_status ?? "ACTIVE");
  const nextRole = input.role ?? (currentRole === "SUPERADMIN" ? "SUPERADMIN" : currentRole);
  const nextAccountStatus = input.accountStatus ?? currentAccountStatus;
  const currentlyAdmin = currentRole === "ADMIN" || currentRole === "SUPERADMIN";
  const retainsAdminPrivileges = nextRole === "ADMIN" || nextRole === "SUPERADMIN";
  const staysActive = nextAccountStatus === "ACTIVE";
  const removesFinalAdmin = currentlyAdmin && (!retainsAdminPrivileges || !staysActive) && countActiveAdmins(input.targetUserId) === 0;

  if (removesFinalAdmin) {
    const blockedReason = "You cannot remove or disable the last active admin.";
    recordAction(actor, "admin.member.update.blocked", input.targetUserId, {
      ...input,
      code: "LAST_ADMIN_PROTECTION",
      blocked: true,
    } as Record<string, unknown>);
    recordAudit(actor, {
      targetUserId: input.targetUserId,
      actionType: "member.update_blocked",
      entityType: "user",
      entityId: input.targetUserId,
      before,
      after: before,
      reason: input.reason ?? blockedReason,
    });
    throw new AppRouteError("LAST_ADMIN_PROTECTION", 409, blockedReason);
  }

  if (input.role) {
    db.prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?").run(input.role, nowIso(), input.targetUserId);
  }
  if (input.accountStatus) {
    db.prepare("UPDATE users SET account_status = ?, updated_at = ? WHERE id = ?").run(input.accountStatus, nowIso(), input.targetUserId);
    if (input.accountStatus === "DISABLED") {
      db.prepare("DELETE FROM sessions WHERE user_id = ?").run(input.targetUserId);
    }
  }
  if (typeof input.emailVerified === "boolean") {
    db.prepare("UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?").run(
      input.emailVerified ? nowIso() : null,
      nowIso(),
      input.targetUserId,
    );
  }
  if (input.plan) {
    const status = input.plan === "PREMIUM" ? "active" : "inactive";
    db.prepare(`
      INSERT INTO subscriptions (id, user_id, plan, status, entitlements_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        plan = excluded.plan,
        status = excluded.status,
        entitlements_json = excluded.entitlements_json,
        updated_at = excluded.updated_at
    `).run(randomUUID(), input.targetUserId, input.plan, status, JSON.stringify({ source: "manual_admin" }), nowIso(), nowIso());
  }

  const after = db.prepare(`
    SELECT
      users.id,
      users.role,
      users.account_status,
      coalesce(subscriptions.plan, 'FREE') AS plan,
      coalesce(subscriptions.status, 'NONE') AS subscription_status
    FROM users
    LEFT JOIN subscriptions ON subscriptions.user_id = users.id
    WHERE users.id = ?
  `).get(input.targetUserId) as Record<string, unknown>;

  recordAction(actor, "admin.member.update", input.targetUserId, input as unknown as Record<string, unknown>);
  recordAudit(actor, {
    targetUserId: input.targetUserId,
    actionType: "member.update",
    entityType: "user",
    entityId: input.targetUserId,
    before,
    after,
    reason: input.reason ?? null,
  });

  return after;
}

export function adminSignOutMemberSessions(actor: Viewer, targetUserId: string, reason?: string) {
  assertRole(actor.role, "ADMIN");
  assertWritableOrThrow(readRuntimeFlagsSnapshot().flags);
  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(targetUserId);
  if (!user) throw new AppRouteError("USER_NOT_FOUND", 404, "User not found.");
  const result = db.prepare("DELETE FROM sessions WHERE user_id = ?").run(targetUserId) as { changes?: number };
  recordAction(actor, "admin.member.signout_sessions", targetUserId, { revoked: Number(result.changes ?? 0), reason: reason ?? null });
  recordAudit(actor, {
    targetUserId,
    actionType: "member.signout_sessions",
    entityType: "user",
    entityId: targetUserId,
    before: { sessions_revoked: 0 },
    after: { sessions_revoked: Number(result.changes ?? 0) },
    reason: reason ?? null,
  });
  return { revoked: Number(result.changes ?? 0) };
}

export function adminForcePasswordReset(actor: Viewer, targetUserId: string, reason?: string) {
  assertRole(actor.role, "ADMIN");
  assertWritableOrThrow(readRuntimeFlagsSnapshot().flags);
  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(targetUserId);
  if (!user) throw new AppRouteError("USER_NOT_FOUND", 404, "User not found.");
  const tokenId = randomUUID();
  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(targetUserId);
  db.prepare(`
    INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(tokenId, targetUserId, tokenHash, expiresAt, nowIso());
  const revoked = db.prepare("DELETE FROM sessions WHERE user_id = ?").run(targetUserId) as { changes?: number };
  recordAction(actor, "admin.member.force_password_reset", targetUserId, { reason: reason ?? null, revoked_sessions: Number(revoked.changes ?? 0) });
  recordAudit(actor, {
    targetUserId,
    actionType: "member.force_password_reset",
    entityType: "user",
    entityId: targetUserId,
    before: {},
    after: { token_id: tokenId, expires_at: expiresAt, revoked_sessions: Number(revoked.changes ?? 0) },
    reason: reason ?? null,
  });
  return { tokenId, token, expiresAt, revokedSessions: Number(revoked.changes ?? 0) };
}

export function listMemberNotes(userId: string) {
  return getDb().prepare(`
    SELECT notes.id, notes.user_id, notes.author_user_id, notes.body, notes.created_at, notes.updated_at,
           author.email AS author_email, author.name AS author_name
    FROM member_notes notes
    LEFT JOIN users author ON author.id = notes.author_user_id
    WHERE notes.user_id = ?
    ORDER BY notes.created_at DESC
    LIMIT 100
  `).all(userId) as Array<Record<string, unknown>>;
}

export function adminCreateMemberNote(actor: Viewer, targetUserId: string, body: string) {
  assertRole(actor.role, "ADMIN");
  assertWritableOrThrow(readRuntimeFlagsSnapshot().flags);
  const trimmed = body.trim();
  if (!trimmed) throw new AppRouteError("NOTE_EMPTY", 400, "Note body is required.");
  if (trimmed.length > 4000) throw new AppRouteError("NOTE_TOO_LONG", 400, "Note exceeds 4000 characters.");
  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(targetUserId);
  if (!user) throw new AppRouteError("USER_NOT_FOUND", 404, "User not found.");
  const id = randomUUID();
  db.prepare(`
    INSERT INTO member_notes (id, user_id, author_user_id, body, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, targetUserId, actor.id, trimmed, nowIso(), nowIso());
  recordAction(actor, "admin.member.note_create", targetUserId, { note_id: id });
  recordAudit(actor, {
    targetUserId,
    actionType: "member.note_create",
    entityType: "member_note",
    entityId: id,
    before: {},
    after: { body_length: trimmed.length },
    reason: null,
  });
  return { id, body: trimmed };
}

export function adminDeleteMemberNote(actor: Viewer, noteId: string) {
  assertRole(actor.role, "ADMIN");
  assertWritableOrThrow(readRuntimeFlagsSnapshot().flags);
  const db = getDb();
  const note = db.prepare("SELECT id, user_id FROM member_notes WHERE id = ?").get(noteId) as { id: string; user_id: string } | undefined;
  if (!note) throw new AppRouteError("NOTE_NOT_FOUND", 404, "Note not found.");
  db.prepare("DELETE FROM member_notes WHERE id = ?").run(noteId);
  recordAction(actor, "admin.member.note_delete", note.user_id, { note_id: noteId });
  recordAudit(actor, {
    targetUserId: note.user_id,
    actionType: "member.note_delete",
    entityType: "member_note",
    entityId: noteId,
    before: { existed: true },
    after: { existed: false },
    reason: null,
  });
  return { ok: true };
}

export function adminSetMarketControl(actor: Viewer, market: string, patch: Record<string, unknown>) {
  assertRole(actor.role, "ADMIN");
  assertWritableOrThrow(readRuntimeFlagsSnapshot().flags);
  const db = getDb();
  const current = db.prepare("SELECT * FROM admin_market_controls WHERE market = ?").get(market) as Record<string, unknown> | undefined;
  if (!current) throw new Error("Market control not found");
  db.prepare(`
    UPDATE admin_market_controls
    SET enabled = ?, publish_freeze = ?, stale_threshold_ms = ?, degraded_mode = ?, suppression_rules_json = ?, warmup_behavior = ?, updated_at = ?
    WHERE market = ?
  `).run(
    patch.enabled ?? current.enabled,
    patch.publishFreeze ?? current.publish_freeze,
    patch.staleThresholdMs ?? current.stale_threshold_ms,
    patch.degradedMode ?? current.degraded_mode,
    JSON.stringify(patch.suppressionRules ?? parseJson(current.suppression_rules_json, [])),
    patch.warmupBehavior ?? current.warmup_behavior,
    nowIso(),
    market,
  );
  recordAction(actor, "admin.market.update", market, patch);
}

export function adminSetModelControl(actor: Viewer, model: string, patch: Record<string, unknown>) {
  assertRole(actor.role, "ADMIN");
  assertWritableOrThrow(readRuntimeFlagsSnapshot().flags);
  const db = getDb();
  db.prepare(`
    UPDATE admin_model_controls
    SET enabled = ?, threshold = ?, updated_at = ?
    WHERE model = ?
  `).run(patch.enabled ?? 1, patch.threshold ?? 70, nowIso(), model);
  recordAction(actor, "admin.model.update", model, patch);
}

export function adminSetExperiment(actor: Viewer, key: string, patch: Record<string, unknown>) {
  assertRole(actor.role, "ADMIN");
  assertWritableOrThrow(readRuntimeFlagsSnapshot().flags);
  getDb().prepare(`
    INSERT INTO feature_flags (key, enabled, description, audience, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      enabled = excluded.enabled,
      description = excluded.description,
      audience = excluded.audience,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at
  `).run(key, patch.enabled ? 1 : 0, patch.description ?? "", patch.audience ?? "all", actor.id, nowIso());
  recordAction(actor, "admin.experiment.update", key, patch);
}

export function adminCreateIncident(actor: Viewer, input: { scope: string; message: string }) {
  assertRole(actor.role, "ADMIN");
  assertWritableOrThrow(readRuntimeFlagsSnapshot().flags);
  getDb().prepare(`
    INSERT INTO admin_incidents (id, scope, message, status, acknowledged_by, resolved_by, created_at, updated_at)
    VALUES (?, ?, ?, 'open', NULL, NULL, ?, ?)
  `).run(randomUUID(), input.scope, input.message, nowIso(), nowIso());
  recordAction(actor, "admin.incident.create", input.scope, input);
}

export function adminResolveIncident(actor: Viewer, id: string) {
  assertRole(actor.role, "ADMIN");
  assertWritableOrThrow(readRuntimeFlagsSnapshot().flags);
  getDb().prepare(`
    UPDATE admin_incidents
    SET status = 'resolved', resolved_by = ?, updated_at = ?
    WHERE id = ?
  `).run(actor.id, nowIso(), id);
  recordAction(actor, "admin.incident.resolve", id, {});
}
