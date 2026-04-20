import { Panel } from "@/components/primitives/Panel";
import { SectionHeader } from "@/components/primitives/SectionHeader";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; message?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-10">
      <SectionHeader title="Verify Email" subtitle="Email verification is mandatory before a session can be created." />
      <Panel title="Verification">
        {params.token ? (
          <form action="/api/auth/verify-email" method="post" className="space-y-4">
            <input type="hidden" name="token" value={params.token} />
            <button type="submit" className="rounded-xl border border-[#5B8CFF]/35 bg-[#5B8CFF]/12 px-4 py-2 text-sm font-semibold text-[#F3F7FF]">
              Verify Email
            </button>
          </form>
        ) : <p className="text-[13px] text-[#A7B4C8]">Open this page from a verification link.</p>}
        {params.message ? <p className="mt-4 text-[13px] text-[#A7B4C8]">{params.message}</p> : null}
        {params.error ? <p className="mt-4 text-[13px] text-[#FF8A8A]">{params.error}</p> : null}
      </Panel>
    </div>
  );
}
