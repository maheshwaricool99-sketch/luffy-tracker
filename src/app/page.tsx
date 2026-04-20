import { resolveEntitlements } from "@/lib/entitlements";
import { HomeSignalPreview } from "@/components/signals/HomeSignalPreview";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { listSignals } from "@/lib/signals/queries/listSignals";

export default async function HomePage() {
  const user = await getSessionUser();
  const entitlements = resolveEntitlements(user);
  const homeSignals = await listSignals({ limit: 8 }, user?.appRole ?? "GUEST", user?.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-10">
      <div className="rounded-3xl border border-white/10 bg-[#081423] p-8">
        <div className="text-[12px] uppercase tracking-[0.12em] text-[#70809A]">Signal Intelligence Terminal</div>
        <h1 className="mt-3 text-4xl font-semibold text-[#F3F7FF]">Production signal delivery with explicit freshness, billing, and access control.</h1>
        <p className="mt-4 max-w-3xl text-[14px] leading-6 text-[#A7B4C8]">
          Public surfaces stay public. Paid surfaces are enforced server-side. Every signal and health surface carries timestamp, freshness, and source-state truth.
        </p>
        <div className="mt-6 flex gap-3">
          <a href="/pricing" className="rounded-xl border border-[#5B8CFF]/35 bg-[#5B8CFF]/12 px-4 py-2 text-sm font-semibold text-[#F3F7FF]">{entitlements.isPremium ? "Manage Plan" : "Buy Premium"}</a>
          {!user ? <a href="/login" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-[#F3F7FF]">Login</a> : null}
          {!user ? <a href="/signup" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-[#F3F7FF]">Create Account</a> : null}
          {user ? <a href="/account" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-[#F3F7FF]">My Account</a> : null}
        </div>
      </div>
      {entitlements.isAdmin ? (
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-[13px] text-yellow-100">
          Admin session active. Additional controls are available in the same shell under the Admin navigation group.
        </div>
      ) : null}
      <div className="rounded-3xl border border-white/10 bg-[#081423] p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] uppercase tracking-[0.12em] text-[#70809A]">Free / Delayed Signals</div>
            <h2 className="mt-2 text-xl font-semibold text-[#F3F7FF]">Public-safe signal preview</h2>
          </div>
          {!entitlements.isPremium ? <a href="/pricing" className="text-sm font-semibold text-[#8DB6FF]">Upgrade for live access</a> : null}
        </div>
        <HomeSignalPreview signals={homeSignals.items} />
      </div>
    </div>
  );
}
