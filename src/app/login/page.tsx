import { Panel } from "@/components/primitives/Panel";
import { SectionHeader } from "@/components/primitives/SectionHeader";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-10">
      <SectionHeader title="Login" subtitle="Log in to access your member or premium experience. Administrative controls appear only for authorized accounts after sign-in." />
      <Panel title="Access">
        <form action="/api/auth/login" method="post" className="space-y-4">
          <input type="hidden" name="next" value={params.next ?? "/intelligence"} />
          <input name="email" type="text" required placeholder="Email or username" className="h-11 w-full rounded-xl border border-white/10 bg-[#0F1D31] px-4 text-sm text-[#F3F7FF]" />
          <input name="password" type="password" required placeholder="Password" className="h-11 w-full rounded-xl border border-white/10 bg-[#0F1D31] px-4 text-sm text-[#F3F7FF]" />
          <button type="submit" className="rounded-xl border border-[#5B8CFF]/35 bg-[#5B8CFF]/12 px-4 py-2 text-sm font-semibold text-[#F3F7FF]">
            Sign In
          </button>
        </form>
        <div className="mt-4 flex gap-4 text-[13px]">
          <a href="/forgot-password" className="text-[#8DB6FF]">Forgot password</a>
          <a href="/signup" className="text-[#8DB6FF]">Create account</a>
        </div>
        {params.message ? <p className="mt-4 text-[13px] text-[#A7B4C8]">{params.message}</p> : null}
        {params.error ? <p className="mt-4 text-[13px] text-[#FF8A8A]">{params.error}</p> : null}
      </Panel>
    </div>
  );
}
