import { cn } from "@/lib/cn";
import { ReactNode } from "react";

type CardProps = {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
};

export function Card({ title, subtitle, children, className }: CardProps) {
  return (
    <section
      className={cn(
        "group rounded-2xl border border-[var(--line)] bg-[var(--surface-glass)] p-4 shadow-[0_16px_40px_rgba(2,8,20,0.34)] backdrop-blur-xl hover:border-[var(--line-strong)] hover:shadow-[0_18px_52px_rgba(2,8,20,0.42)]",
        className,
      )}
    >
      {(title || subtitle) && (
        <header className="mb-3.5 space-y-1">
          {title && (
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--text-strong)]">
              {title}
            </h3>
          )}
          {subtitle && <p className="text-[12px] leading-5 text-[var(--text-soft)]">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
