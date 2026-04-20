import Link from "next/link";
import { Panel } from "@/components/primitives/Panel";
import { SectionHeader } from "@/components/primitives/SectionHeader";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-5">
      <SectionHeader title="Checkout Success" subtitle="Stripe has returned control to the app; entitlement activation completes via webhook sync." />
      <Panel title="Subscription Processing">
        <p className="text-[13px] text-[#A7B4C8]">
          Stripe session: <span className="text-[#F3F7FF]">{params.session_id ?? "Unavailable"}</span>
        </p>
        <p className="mt-2 text-[13px] text-[#A7B4C8]">Refresh billing after the webhook lands if premium access does not appear immediately.</p>
        <Link href="/billing" className="mt-4 inline-flex rounded-xl border border-[#5B8CFF]/35 bg-[#5B8CFF]/12 px-4 py-2 text-sm font-semibold text-[#F3F7FF]">
          Open Billing
        </Link>
      </Panel>
    </div>
  );
}
