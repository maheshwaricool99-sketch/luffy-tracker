import { Panel } from "@/components/primitives/Panel";
import { SectionHeader } from "@/components/primitives/SectionHeader";
import { runtimeConfig } from "@/lib/runtime";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const runtime = await runtimeConfig.getAll();
  const signupBlocked =
    runtime.flags.maintenance_mode ||
    runtime.flags.read_only_mode ||
    runtime.flags.disable_signup;
  const signupMessage = runtime.flags.maintenance_mode
    ? "Account creation is paused while the platform is in maintenance mode."
    : runtime.flags.read_only_mode
    ? "Account creation is temporarily unavailable while the platform is read-only."
    : runtime.flags.disable_signup
    ? "Signups are temporarily disabled by runtime control."
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-10">
      <SectionHeader title="Signup" subtitle="Create an account, issue a verification token, and promote to free access only after verification." />
      <Panel title="Workspace Enrollment">
        {signupMessage ? (
          <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-[13px] text-amber-100">
            {signupMessage}
          </div>
        ) : null}
        <form action="/api/auth/signup" method="post" className="space-y-4">
          <input disabled={signupBlocked} name="name" type="text" placeholder="Name" className="h-11 w-full rounded-xl border border-white/10 bg-[#0F1D31] px-4 text-sm text-[#F3F7FF] disabled:cursor-not-allowed disabled:opacity-50" />
          <input disabled={signupBlocked} name="email" type="email" required placeholder="Email" className="h-11 w-full rounded-xl border border-white/10 bg-[#0F1D31] px-4 text-sm text-[#F3F7FF] disabled:cursor-not-allowed disabled:opacity-50" />
          <input disabled={signupBlocked} name="password" type="password" required minLength={10} placeholder="Password (min 10 chars)" className="h-11 w-full rounded-xl border border-white/10 bg-[#0F1D31] px-4 text-sm text-[#F3F7FF] disabled:cursor-not-allowed disabled:opacity-50" />
          <button disabled={signupBlocked} type="submit" className="rounded-xl border border-[#5B8CFF]/35 bg-[#5B8CFF]/12 px-4 py-2 text-sm font-semibold text-[#F3F7FF] disabled:cursor-not-allowed disabled:opacity-50">
            Create Account
          </button>
        </form>
        {params.error ? <p className="mt-4 text-[13px] text-[#FF8A8A]">{params.error}</p> : null}
      </Panel>
    </div>
  );
}
