import { syncSubscriptionFromStripe, verifyStripeWebhookSignature } from "@/lib/stripe";

export async function POST(request: Request) {
  const payload = await request.text();
  verifyStripeWebhookSignature(payload, request.headers.get("stripe-signature"));
  const event = JSON.parse(payload) as { type: string; data?: { object?: Record<string, unknown> } };

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    syncSubscriptionFromStripe(event as { type: string; data?: { object?: { id: string; customer: string; status: string } } });
  }

  return Response.json({ received: true });
}
