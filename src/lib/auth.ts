import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, nowIso } from "@/lib/db";
import { getBillingStatus } from "@/lib/stripe";
import { type Role, isRole } from "@/lib/roles";
import type { Viewer } from "@/lib/entitlements";
import { sendMail } from "@/lib/mail";
import { canProcessSignup, runtimeConfig } from "@/lib/runtime";
import { publicAppUrl } from "@/lib/auth/publicAppUrl";

const SESSION_COOKIE = "signal_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TOKEN_TTL_MS = 60 * 60 * 1000;

function secret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "local-dev-auth-secret";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function encodeCookieValue(value: string) {
  return `${value}.${sign(value)}`;
}

function decodeCookieValue(raw: string | undefined) {
  if (!raw) return null;
  const [value, signature] = raw.split(".");
  if (!value || !signature) return null;
  const expected = sign(value);
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    return null;
  }
  return value;
}

function hashSecretValue(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function passwordHash(password: string, salt = randomBytes(16).toString("hex")) {
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function passwordMatches(password: string, stored: string) {
  const [salt, derived] = stored.split(":");
  if (!salt || !derived) return false;
  const actual = scryptSync(password, salt, 64).toString("hex");
  return actual.length === derived.length && timingSafeEqual(Buffer.from(actual), Buffer.from(derived));
}


function bootstrapRole(email: string): Role {
  const raw = process.env.BOOTSTRAP_SUPERADMIN_EMAILS ?? "";
  const emails = raw.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  return emails.includes(email.toLowerCase()) ? "SUPERADMIN" : "MEMBER";
}

function mapViewer(row: Record<string, unknown>): Viewer {
  const role = isRole(String(row.role ?? "")) ? String(row.role) as Role : "MEMBER";
  const billing = getBillingStatus(String(row.id));
  return {
    id: String(row.id),
    email: String(row.email),
    name: row.name ? String(row.name) : null,
    username: row.username ? String(row.username) : null,
    role,
    accountStatus: String(row.account_status ?? "ACTIVE") === "DISABLED" ? "DISABLED" : "ACTIVE",
    emailVerified: Boolean(row.email_verified_at),
    lastLoginAt: row.last_login_at ? String(row.last_login_at) : null,
    subscription: billing,
  };
}

export const getViewer = cache(async () => {
  const cookieStore = await cookies();
  const sessionId = decodeCookieValue(cookieStore.get(SESSION_COOKIE)?.value);
  if (!sessionId) return null;

  const db = getDb();
  const row = db.prepare(`
    SELECT users.*
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.id = ? AND sessions.expires_at > ? AND users.account_status = 'ACTIVE'
  `).get(sessionId, nowIso()) as Record<string, unknown> | undefined;

  return row ? mapViewer(row) : null;
});

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent("/")}`);
  return viewer;
}

export async function createSession(userId: string) {
  const db = getDb();
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(id, userId, expiresAt, nowIso());
  return {
    cookieName: SESSION_COOKIE,
    cookieValue: encodeCookieValue(id),
    expiresAt,
  };
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const sessionId = decodeCookieValue(cookieStore.get(SESSION_COOKIE)?.value);
  if (!sessionId) return;
  getDb().prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

export async function createUser(input: { email: string; password: string; name?: string | null }) {
  canProcessSignup((await runtimeConfig.getAll()).flags);
  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(input.email.toLowerCase()) as { id?: string } | undefined;
  if (existing?.id) {
    throw new Error("An account with this email already exists");
  }

  const now = nowIso();
  const id = randomUUID();
  db.prepare(`
    INSERT INTO users (id, email, username, password_hash, role, account_status, name, created_at, updated_at)
    VALUES (?, ?, NULL, ?, ?, 'ACTIVE', ?, ?, ?)
  `).run(id, input.email.toLowerCase(), passwordHash(input.password), bootstrapRole(input.email), input.name ?? null, now, now);

  db.prepare(`
    INSERT INTO subscriptions (id, user_id, plan, status, entitlements_json, created_at, updated_at)
    VALUES (?, ?, 'FREE', 'inactive', '{}', ?, ?)
  `).run(randomUUID(), id, now, now);

  db.prepare(`
    INSERT INTO user_settings (user_id, notifications_json, profile_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, JSON.stringify({
    emailSignals: false,
    realtimeInApp: false,
    digest: true,
  }), JSON.stringify({}), now, now);

  return id;
}

async function issueToken(table: "verification_tokens" | "password_reset_tokens", userId: string) {
  const token = randomBytes(32).toString("hex");
  const db = getDb();
  db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(userId);
  db.prepare(`
    INSERT INTO ${table} (id, user_id, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(randomUUID(), userId, hashSecretValue(token), new Date(Date.now() + TOKEN_TTL_MS).toISOString(), nowIso());
  return token;
}

export async function sendVerificationEmail(email: string) {
  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase()) as { id?: string } | undefined;
  if (!user?.id) return { ok: true };
  const token = await issueToken("verification_tokens", user.id);
  const url = `${publicAppUrl()}/verify-email?token=${token}`;
  const delivery = await sendMail({
    to: email,
    subject: "Verify your Signal Intelligence account",
    html: `<p>Verify your account:</p><p><a href="${url}">${url}</a></p>`,
  });
  return { ok: true, previewUrl: delivery.preview ? url : null };
}

export async function sendPasswordResetEmail(email: string) {
  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase()) as { id?: string } | undefined;
  if (!user?.id) return { ok: true };
  const token = await issueToken("password_reset_tokens", user.id);
  const url = `${publicAppUrl()}/reset-password?token=${token}`;
  const delivery = await sendMail({
    to: email,
    subject: "Reset your Signal Intelligence password",
    html: `<p>Reset your password:</p><p><a href="${url}">${url}</a></p>`,
  });
  return { ok: true, previewUrl: delivery.preview ? url : null };
}

export function verifyEmailToken(token: string) {
  const db = getDb();
  const row = db.prepare(`
    SELECT users.id
    FROM verification_tokens
    JOIN users ON users.id = verification_tokens.user_id
    WHERE verification_tokens.token_hash = ? AND verification_tokens.expires_at > ?
  `).get(hashSecretValue(token), nowIso()) as { id?: string } | undefined;

  if (!row?.id) return false;
  const now = nowIso();
  db.prepare("UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?").run(now, now, row.id);
  db.prepare("DELETE FROM verification_tokens WHERE user_id = ?").run(row.id);
  return true;
}

export function resetPasswordWithToken(token: string, password: string) {
  const db = getDb();
  const row = db.prepare(`
    SELECT users.id
    FROM password_reset_tokens
    JOIN users ON users.id = password_reset_tokens.user_id
    WHERE password_reset_tokens.token_hash = ? AND password_reset_tokens.expires_at > ?
  `).get(hashSecretValue(token), nowIso()) as { id?: string } | undefined;

  if (!row?.id) return false;
  db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(passwordHash(password), nowIso(), row.id);
  db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(row.id);
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(row.id);
  return true;
}

export async function authenticateUser(email: string, password: string) {
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  const row = db.prepare("SELECT * FROM users WHERE lower(email) = ? OR lower(coalesce(username, '')) = ?").get(normalized, normalized) as Record<string, unknown> | undefined;
  if (!row || !passwordMatches(password, String(row.password_hash ?? ""))) {
    throw new Error("Invalid email or password");
  }
  if (String(row.account_status ?? "ACTIVE") !== "ACTIVE") {
    throw new Error("This account is disabled");
  }
  if (!row.email_verified_at) {
    throw new Error("Verify your email before signing in");
  }
  db.prepare("UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?").run(nowIso(), nowIso(), String(row.id));
  return mapViewer(row);
}

export function getUserWatchlistCount(userId: string) {
  const row = getDb().prepare("SELECT COUNT(*) AS count FROM watchlists WHERE user_id = ?").get(userId) as { count: number };
  return row.count;
}

export function getUserAlertCount(userId: string) {
  const row = getDb().prepare("SELECT COUNT(*) AS count FROM alerts WHERE user_id = ?").get(userId) as { count: number };
  return row.count;
}
