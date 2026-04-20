import { ReactNode } from "react";

type SectionContainerProps = {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children?: ReactNode;
};

export function SectionContainer({ title, subtitle, action, children }: SectionContainerProps) {
  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 border-b border-[var(--line)] pb-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold tracking-tight text-[var(--text-strong)]">{title}</h1>
          <p className="text-[13px] leading-5 text-[var(--text-soft)]">{subtitle}</p>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
