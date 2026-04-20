import { getViewer } from "@/lib/auth";
import { LockedFeature } from "@/components/ui/locked-feature";
import { Panel } from "@/components/primitives/Panel";
import { SectionHeader } from "@/components/primitives/SectionHeader";
import { runtimeConfig } from "@/lib/runtime";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const viewer = await getViewer();
  const params = await searchParams;
  const runtime = await runtimeConfig.getAll();
  const checkoutBlocked =
    runtime.flags.maintenance_mode ||
    runtime.flags.read_only_mode ||
    runtime.flags.freeze_upgrades;
  const portalBlocked =
    runtime.flags.maintenance_mode ||
    runtime.flags.read_only_mode ||
    runtime.flags.freeze_upgrades;
  const billingMessage = runtime.flags.maintenance_mode
    ? "Billing mutations are paused while the platform is in maintenance mode."
    : runtime.flags.read_only_mode
    ? "Billing changes are temporarily unavailable while the platform is read-only."
    : runtime.flags.freeze_upgrades
    ? "Premium upgrades and billing changes are temporarily frozen by runtime control."
    : null;

  return (
    <div className="space-y-5">
      <SectionHeader title="Billing" subtitle="Stripe checkout, portal access, and entitlement sync live here." />
      <Panel title="Billing Overview">
        {viewer ? (
          <div className="space-y-4 text-[13px] text-[#A7B4C8]">
            {billingMessage ? (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-amber-100">
                {billingMessage}
              </div>
            ) : null}
            <div>Plan <span className="float-right text-[#F3F7FF]">{viewer.subscription?.plan ?? "FREE"}</span></div>
            <div>Status <span className="float-right text-[#F3F7FF]">{viewer.subscription?.status ?? "inactive"}</span></div>
            <div>Current period end <span className="float-right text-[#F3F7FF]">{viewer.subscription?.currentPeriodEnd ? new Date(viewer.subscription.currentPeriodEnd).toLocaleString() : "--"}</span></div>
            <div className="flex gap-3">
              <form action="/api/billing/checkout" method="post">
                <button disabled={checkoutBlocked} type="submit" className="rounded-xl border border-[#5B8CFF]/35 bg-[#5B8CFF]/12 px-4 py-2 text-sm font-semibold text-[#F3F7FF] disabled:cursor-not-allowed disabled:opacity-50">
                  Start Premium Checkout
                </button>
              </form>
              <form action="/api/billing/portal" method="post">
                <button disabled={portalBlocked} type="submit" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-[#F3F7FF] disabled:cursor-not-allowed disabled:opacity-50">
                  Open Customer Portal
                </button>
              </form>
            </div>
            {params.error ? <p className="text-[#FF8A8A]">{params.error}</p> : null}
          </div>
        ) : (
          <LockedFeature title="Billing requires an authenticated account." detail="Create an account first, then return here for checkout or portal access." />
        )}
      </Panel>
    </div>
  );
}
