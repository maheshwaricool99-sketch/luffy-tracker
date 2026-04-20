import { Panel } from "@/components/primitives/Panel";
import { SectionHeader } from "@/components/primitives/SectionHeader";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string; preview?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-10">
      <SectionHeader title="Forgot Password" subtitle="Issue a real reset token and send it through the configured delivery channel." />
      <Panel title="Reset Access">
        <form action="/api/auth/forgot-password" method="post" className="space-y-4">
          <input name="email" type="email" required placeholder="Email" className="h-11 w-full rounded-xl border border-white/10 bg-[#0F1D31] px-4 text-sm text-[#F3F7FF]" />
          <button type="submit" className="rounded-xl border border-[#5B8CFF]/35 bg-[#5B8CFF]/12 px-4 py-2 text-sm font-semibold text-[#F3F7FF]">
            Send Reset Email
          </button>
        </form>
        {params.message ? <p className="mt-4 text-[13px] text-[#A7B4C8]">{params.message}</p> : null}
        {params.error ? <p className="mt-4 text-[13px] text-[#FF8A8A]">{params.error}</p> : null}
        {params.preview ? <a href={params.preview} className="mt-3 inline-block text-[13px] text-[#8DB6FF]">Open reset preview</a> : null}
      </Panel>
    </div>
  );
}
