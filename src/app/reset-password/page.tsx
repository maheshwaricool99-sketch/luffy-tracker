import { Panel } from "@/components/primitives/Panel";
import { SectionHeader } from "@/components/primitives/SectionHeader";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-10">
      <SectionHeader title="Reset Password" subtitle="Reset requires a valid issued token; expired or missing tokens fail loudly." />
      <Panel title="Set New Password">
        <form action="/api/auth/reset-password" method="post" className="space-y-4">
          <input type="hidden" name="token" value={params.token ?? ""} />
          <input name="password" type="password" required minLength={10} placeholder="New password" className="h-11 w-full rounded-xl border border-white/10 bg-[#0F1D31] px-4 text-sm text-[#F3F7FF]" />
          <button type="submit" className="rounded-xl border border-[#5B8CFF]/35 bg-[#5B8CFF]/12 px-4 py-2 text-sm font-semibold text-[#F3F7FF]">
            Update Password
          </button>
        </form>
        {params.message ? <p className="mt-4 text-[13px] text-[#A7B4C8]">{params.message}</p> : null}
        {params.error ? <p className="mt-4 text-[13px] text-[#FF8A8A]">{params.error}</p> : null}
      </Panel>
    </div>
  );
}
