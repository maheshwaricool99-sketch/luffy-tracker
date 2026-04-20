import { Panel } from "@/components/primitives/Panel";
import { SectionHeader } from "@/components/primitives/SectionHeader";
import { runtimeConfig } from "@/lib/runtime";

export default async function PricingPage() {
  const runtime = await runtimeConfig.getAll();
  const signupBlocked =
    runtime.flags.maintenance_mode ||
    runtime.flags.read_only_mode ||
    runtime.flags.disable_signup;
  const upgradesBlocked =
    runtime.flags.maintenance_mode ||
    runtime.flags.read_only_mode ||
    runtime.flags.freeze_upgrades;
  const tiers = [
    {
      name: "Free",
      price: "$0",
      points: ["Delayed signals only", "Limited history", "Basic watchlists", "Digest-style alerts"],
    },
    {
      name: "Premium",
      price: "Stripe",
      points: ["Live signals", "Full history and rationale", "Realtime alerts", "Advanced watchlists and intelligence"],
    },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader title="Pricing" subtitle="Free and premium access are enforced at the route, API, and data-filter layers." />
      {signupBlocked || upgradesBlocked ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-[13px] text-amber-100">
          {runtime.flags.maintenance_mode
            ? "Pricing controls are limited during maintenance mode."
            : runtime.flags.read_only_mode
            ? "Account and billing mutations are temporarily unavailable while the platform is read-only."
            : runtime.flags.freeze_upgrades
            ? "Premium upgrades are temporarily frozen by runtime control."
            : "Signup is temporarily disabled by runtime control."}
        </div>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {tiers.map((tier) => (
          <Panel key={tier.name} title={tier.name}>
            <div className="text-2xl font-semibold text-[#F3F7FF]">{tier.price}</div>
            <div className="mt-3 space-y-2 text-[13px] text-[#A7B4C8]">
              {tier.points.map((point) => <div key={point}>{point}</div>)}
            </div>
            {tier.name === "Premium" ? (
              <a
                href={upgradesBlocked ? "#" : "/billing"}
                aria-disabled={upgradesBlocked}
                className={`mt-4 inline-flex rounded-xl border border-[#5B8CFF]/35 bg-[#5B8CFF]/12 px-4 py-2 text-sm font-semibold text-[#F3F7FF] ${upgradesBlocked ? "pointer-events-none opacity-50" : ""}`}
              >
                {runtime.flags.freeze_upgrades ? "Upgrades Frozen" : "Manage Billing"}
              </a>
            ) : (
              <a
                href={signupBlocked ? "#" : "/signup"}
                aria-disabled={signupBlocked}
                className={`mt-4 inline-flex rounded-xl border border-[#5B8CFF]/35 bg-[#5B8CFF]/12 px-4 py-2 text-sm font-semibold text-[#F3F7FF] ${signupBlocked ? "pointer-events-none opacity-50" : ""}`}
              >
                {signupBlocked ? "Signup Paused" : "Create Account"}
              </a>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}
