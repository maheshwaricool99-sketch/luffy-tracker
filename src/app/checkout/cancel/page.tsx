import Link from "next/link";
import { Panel } from "@/components/primitives/Panel";
import { SectionHeader } from "@/components/primitives/SectionHeader";

export default function CheckoutCancelPage() {
  return (
    <div className="space-y-5">
      <SectionHeader title="Checkout Cancelled" subtitle="No entitlement change was applied." />
      <Panel title="Subscription">
        <p className="text-[13px] text-[#A7B4C8]">The checkout session was cancelled before Stripe confirmed payment.</p>
        <Link href="/pricing" className="mt-4 inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-[#F3F7FF]">
          Return to Pricing
        </Link>
      </Panel>
    </div>
  );
}
