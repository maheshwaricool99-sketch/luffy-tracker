import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PanelProps = {
  title?: string;
  subtitle?: string;
  headerRight?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
};

export function Panel({ title, subtitle, headerRight, className, bodyClassName, children }: PanelProps) {
  return (
    <section className={cn("rounded-2xl border border-white/10 bg-[#0B1728] shadow-[0_8px_24px_rgba(0,0,0,0.22)]", className)}>
      {(title || subtitle || headerRight) && (
        <header className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
          <div className="min-w-0">
            {title ? <h3 className="text-[15px] font-semibold leading-5 text-[#F3F7FF]">{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-[12px] font-medium leading-4 text-[#70809A]">{subtitle}</p> : null}
          </div>
          {headerRight}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}
