import type { ReactNode } from "react";
import { Suspense } from "react";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { SidebarNav } from "./SidebarNav";
import { TopBar } from "./TopBar";
import { ClientShell } from "./ClientShell";

export async function AppShell({ children }: { children: ReactNode }) {
  const viewer = await getSessionUser();
  return (
    <ClientShell viewer={viewer}>
      <div className="flex min-h-screen w-full overflow-x-hidden bg-[#06111F] text-[#F3F7FF]">
        {/* Desktop sidebar — hidden on mobile, shown on lg+ */}
        <Suspense
          fallback={
            <div className="fixed bottom-0 left-0 top-0 hidden w-[272px] border-r border-white/10 bg-[#081423] lg:block" />
          }
        >
          <SidebarNav viewer={viewer} />
        </Suspense>

        {/* Main content column */}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden lg:pl-[272px]">
          <Suspense
            fallback={
              <div className="sticky top-0 z-20 h-14 border-b border-white/10 bg-[rgba(8,20,35,0.92)] md:h-16" />
            }
          >
            <TopBar viewer={viewer} />
          </Suspense>

          <main className="min-h-screen w-full min-w-0 flex-1 overflow-x-hidden">
            <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ClientShell>
  );
}
