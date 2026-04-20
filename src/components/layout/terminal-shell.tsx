import { ReactNode, Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";

type TerminalShellProps = { children: ReactNode };

export function TerminalShell({ children }: TerminalShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_42%),_var(--bg-main)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1800px] flex-1 flex-col md:flex-row md:px-3 md:py-3">
        <Suspense fallback={<div className="w-full border-b border-[var(--line)] bg-[var(--surface-glass)] md:w-64 md:border-b-0 md:border-r" />}>
          <Sidebar />
        </Suspense>
        <div className="flex min-h-screen min-w-0 flex-1 flex-col rounded-[28px] border border-white/[0.04] bg-[rgba(9,15,23,0.6)] shadow-[0_24px_80px_rgba(2,8,20,0.42)] md:ml-3">
          <Suspense fallback={<div className="h-[62px] border-b border-[var(--line)] bg-[var(--surface-glass)]" />}>
            <TopBar />
            <main className="smooth-scroll-pane flex-1 overflow-visible p-3.5 md:p-5">{children}</main>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
