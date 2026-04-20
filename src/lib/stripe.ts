import { createHmac, timingSafeEqual } from "node:crypto";
import { randomUUID } from "node:crypto";
import { getDb, nowIso, parseJson } from "@/lib/db";
import type { Plan, Viewer } from "@/lib/entitlements";
import { canCreateCheckout, canOpenBillingPortal, runtimeConfig } from "@/lib/runtime";

const STRIPE_API = "https://api.stripe.com/v1";

function requireStripeConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_PREMIUM_MONTHLY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

  if (!secretKey || !priceId || !appUrl) {
    throw new Error("Stripe is not fully configured");
  }

  return { secretKey, priceId, appUrl };
}

async function stripeForm(path: string, params: URLSearchParams) {
  const { secretKey } = requireStripeConfig();
  const response = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Stripe request failed with ${response.status}`);
  }

  return response.json();
}

export async function ensureStripeCustomer(viewer: Viewer) {
  const db = getDb();
  const existing = db.prepare("SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?").get(viewer.id) as { stripe_customer_id?: string } | undefined;
  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const customer = await stripeForm("/customers", new URLSearchParams({
    email: viewer.email,
    name: viewer.name ?? viewer.email,
    "metadata[userId]": viewer.id,
  }));

  const now = nowIso();
  db.prepare(`
    INSERT INTO subscriptions (
      id, user_id, plan, status, stripe_customer_id, entitlements_json, created_at, updated_at
    ) VALUES (?, ?, 'FREE', 'inactive', ?, '{}', ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id = excluded.stripe_customer_id, updated_at = excluded.updated_at
  `).run(randomUUID(), viewer.id, String(customer.id), now, now);

  return String(customer.id);
}

export async function createCheckoutSession(viewer: Viewer) {
  canCreateCheckout((await runtimeConfig.getAll()).flags);
  const { priceId, appUrl } = requireStripeConfig();
  const customerId = await ensureStripeCustomer(viewer);
  const params = new URLSearchParams({
    mode: "subscription",
    customer: customerId,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing?checkout=cancelled`,
    "metadata[userId]": viewer.id,
  });

  return stripeForm("/checkout/sessions", params);
}

export async function createPortalSession(viewer: Viewer) {
  canOpenBillingPortal((await runtimeConfig.getAll()).flags);
  const { appUrl } = requireStripeConfig();
  const customerId = await ensureStripeCustomer(viewer);
  return stripeForm("/billing_portal/sessions", new URLSearchParams({
    customer: customerId,
    return_url: `${appUrl}/billing`,
  }));
}

export function verifyStripeWebhookSignature(payload: string, signatureHeader: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("Stripe webhook secret missing");
  if (!signatureHeader) throw new Error("Missing Stripe signature");

  const fields = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    }),
  );

  const signedPayload = `${fields.t}.${payload}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");
  const actual = fields.v1 ?? "";

  if (expected.length !== actual.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) {
    throw new Error("Invalid Stripe signature");
  }
}

type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, string>;
  items?: {
    data?: Array<{
      price?: {
        id?: string;
      };
    }>;
  };
};

export function syncSubscriptionFromStripe(event: { type: string; data?: { object?: StripeSubscription } }) {
  const object = event.data?.object;
  if (!object) return;

  const db = getDb();
  const customerId = String(object.customer ?? "");
  const existing = db.prepare("SELECT user_id, entitlements_json FROM subscriptions WHERE stripe_customer_id = ? OR stripe_subscription_id = ?").get(customerId, object.id) as { user_id?: string; entitlements_json?: string } | undefined;
  const userId = existing?.user_id ?? object.metadata?.userId;
  if (!userId) return;

  const now = nowIso();
  const isPremium = ["active", "trialing", "past_due"].includes(object.status);
  db.prepare(`
    INSERT INTO subscriptions (
      id, user_id, plan, status, current_period_start, current_period_end, cancel_at_period_end,
      stripe_customer_id, stripe_subscription_id, entitlements_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      plan = excluded.plan,
      status = excluded.status,
      current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end,
      cancel_at_period_end = excluded.cancel_at_period_end,
      stripe_customer_id = excluded.stripe_customer_id,
      stripe_subscription_id = excluded.stripe_subscription_id,
      entitlements_json = excluded.entitlements_json,
      updated_at = excluded.updated_at
  `).run(
    randomUUID(),
    userId,
    isPremium ? "PREMIUM" : "FREE",
    object.status,
    object.current_period_start ? new Date(object.current_period_start * 1000).toISOString() : null,
    object.current_period_end ? new Date(object.current_period_end * 1000).toISOString() : null,
    object.cancel_at_period_end ? 1 : 0,
    customerId || null,
    object.id,
    JSON.stringify({
      canViewLiveSignals: isPremium,
      canViewFullHistory: isPremium,
      canUseRealtimeAlerts: isPremium,
      syncedFromEvent: event.type,
    }),
    now,
    now,
  );
}

export function getBillingStatus(userId: string) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").get(userId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    plan: (String(row.plan) === "PREMIUM" ? "PREMIUM" : "FREE") as Plan,
    status: String(row.status),
    currentPeriodStart: row.current_period_start ? String(row.current_period_start) : null,
    currentPeriodEnd: row.current_period_end ? String(row.current_period_end) : null,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    stripeCustomerId: row.stripe_customer_id ? String(row.stripe_customer_id) : null,
    stripeSubscriptionId: row.stripe_subscription_id ? String(row.stripe_subscription_id) : null,
    entitlements: parseJson<Record<string, unknown>>(row.entitlements_json, {}),
  };
}
