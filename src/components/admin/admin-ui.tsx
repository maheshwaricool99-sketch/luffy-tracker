"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { StatusChip } from "@/components/primitives/StatusChip";
import { PrimaryButton } from "@/components/primitives/PrimaryButton";
import { SecondaryButton } from "@/components/primitives/SecondaryButton";

export function AdminPage({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1600px] space-y-4 pb-8 sm:space-y-5 lg:space-y-6">{children}</div>;
}

export function AdminHeader({
  title,
  description,
  badges,
  actions,
}: {
  title: string;
  description: string;
  badges?: Array<{ label: string; tone?: "green" | "red" | "yellow" | "blue" | "neutral" }>;
  actions?: ReactNode;
}) {
  return (
    <section className="flex min-h-[88px] flex-col justify-between gap-4 rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(12,25,39,0.98),rgba(5,11,21,0.94))] px-4 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.25)] sm:px-5 sm:py-5 md:flex-row md:items-end">
      <div className="min-w-0">
        <h1 className="text-[28px] font-bold leading-[34px] tracking-[-0.03em] text-[#F5FAFF]">{title}</h1>
        <p className="mt-1.5 max-w-3xl text-[14px] leading-6 text-[#9FB1C7]">{description}</p>
        {badges?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {badges.map((badge) => (
              <StatusChip key={badge.label} label={badge.label} tone={badge.tone ?? "neutral"} className="h-7 px-2.5 text-[12px]" />
            ))}
          </div>
        ) : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">{actions}</div> : null}
    </section>
  );
}

export function AdminActionRow({
  primary,
  secondary,
  tertiary,
}: {
  primary?: { label: string; onClick?: () => void; href?: string; disabled?: boolean; title?: string };
  secondary?: { label: string; onClick?: () => void; disabled?: boolean; title?: string };
  tertiary?: { label: string; onClick?: () => void; disabled?: boolean; title?: string };
}) {
  return (
    <>
      {tertiary ? <SecondaryButton onClick={tertiary.onClick} disabled={tertiary.disabled} title={tertiary.title}>{tertiary.label}</SecondaryButton> : null}
      {secondary ? <SecondaryButton onClick={secondary.onClick} disabled={secondary.disabled} title={secondary.title}>{secondary.label}</SecondaryButton> : null}
      {primary ? <PrimaryButton onClick={primary.onClick} disabled={primary.disabled} title={primary.title}>{primary.label}</PrimaryButton> : null}
    </>
  );
}

export function AdminStatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-6", className)}>{children}</div>;
}

export function AdminStatCard({
  label,
  value,
  subtext,
  chip,
  accent = "neutral",
}: {
  label: string;
  value: string;
  subtext?: string;
  chip?: ReactNode;
  accent?: "neutral" | "green" | "amber" | "red" | "blue";
}) {
  const accents = {
    neutral: "border-white/10",
    green: "border-emerald-400/20 shadow-[0_10px_35px_rgba(16,185,129,0.08)]",
    amber: "border-amber-400/20 shadow-[0_10px_35px_rgba(245,158,11,0.08)]",
    red: "border-rose-400/20 shadow-[0_10px_35px_rgba(244,63,94,0.08)]",
    blue: "border-sky-400/20 shadow-[0_10px_35px_rgba(56,189,248,0.08)]",
  } as const;
  return (
    <article className={cn("min-h-[112px] rounded-[18px] border bg-[#0B1728] p-[18px] transition-colors hover:bg-[#0F1D31]", accents[accent])}>
      <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#7488A0]">{label}</div>
      <div className="mt-2.5 break-words text-[30px] font-bold leading-[34px] tracking-[-0.03em] text-[#F4F8FD]">{value}</div>
      {subtext ? <div className="mt-1.5 text-[12px] text-[#8FA5BE]">{subtext}</div> : null}
      {chip ? <div className="mt-3">{chip}</div> : null}
    </article>
  );
}

export function AdminToolbar({
  left,
  right,
}: {
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="flex min-h-14 flex-col gap-3 rounded-[16px] border border-white/10 bg-[#0B1728] px-[14px] py-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">{left}</div>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:w-auto xl:justify-end">{right}</div>
    </section>
  );
}

export function AdminSearch(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn("h-10 w-full rounded-xl border border-white/10 bg-[#0F1D31] px-3.5 text-sm text-[#F3F7FF] outline-none placeholder:text-[#70809A] sm:max-w-[320px]", props.className)}
    />
  );
}

export function AdminSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn("h-10 w-full rounded-xl border border-white/10 bg-[#0F1D31] px-3.5 text-sm text-[#F3F7FF] outline-none sm:min-w-[140px] sm:w-auto", props.className)}
    />
  );
}

export function AdminPanel({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-[20px] border border-white/10 bg-[#0B1728] shadow-[0_8px_24px_rgba(0,0,0,0.22)]", className)}>
      <header className="flex flex-col items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-4 sm:flex-row sm:px-5">
        <div>
          <h2 className="text-[15px] font-semibold text-[#F3F7FF]">{title}</h2>
          {subtitle ? <p className="mt-1 text-[12px] text-[#7488A0]">{subtitle}</p> : null}
        </div>
        {actions}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function AdminTable({
  columns,
  rows,
  renderRow,
  cardRender,
}: {
  columns: string[];
  rows: Array<{ id: string }>;
  renderRow: (row: { id: string }) => ReactNode;
  cardRender: (row: { id: string }) => ReactNode;
}) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-[20px] border border-white/10 bg-[#0B1728] lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="sticky top-0 z-10 h-[52px] bg-[#081321]">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="px-4 py-3 text-[12px] font-bold uppercase tracking-[0.09em] text-[#70839B]">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>{rows.map((row) => renderRow(row))}</tbody>
          </table>
        </div>
      </div>
      <div className="grid gap-3 lg:hidden">{rows.map((row) => cardRender(row))}</div>
    </>
  );
}

export function AdminDrawer({
  open,
  onClose,
  title,
  subtitle,
  status,
  tabs,
  activeTab,
  onTabChange,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  status?: ReactNode;
  tabs?: string[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className={cn("fixed inset-0 z-50 transition pointer-events-none", open ? "pointer-events-auto" : "")}>
      <div className={cn("absolute inset-0 bg-[rgba(4,8,16,0.66)] transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <aside className={cn("absolute right-0 top-0 h-dvh w-full max-w-[520px] transform border-l border-white/10 bg-[#081321] shadow-[0_30px_80px_rgba(0,0,0,0.45)] transition-transform md:rounded-l-[24px]", open ? "translate-x-0" : "translate-x-full")}>
        <div className="flex h-full flex-col">
          <header className="sticky top-0 z-10 border-b border-white/10 bg-[#081321]/95 px-4 py-4 backdrop-blur sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-[20px] font-semibold text-[#F4F8FD]">{title}</h3>
                  {status}
                </div>
                {subtitle ? <p className="mt-1 text-[12px] text-[#8EA3BC]">{subtitle}</p> : null}
              </div>
              <button aria-label="Close drawer" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#A7B4C8] hover:bg-white/[0.08] hover:text-white">✕</button>
            </div>
            {tabs?.length && activeTab && onTabChange ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => onTabChange(tab)}
                    className={cn("rounded-xl border px-3 py-2 text-[12px] font-semibold", activeTab === tab ? "border-[#5B8CFF]/35 bg-[#5B8CFF]/12 text-[#F3F7FF]" : "border-white/10 bg-white/[0.03] text-[#9FB1C7]")}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            ) : null}
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">{children}</div>
          {footer ? <footer className="sticky bottom-0 border-t border-white/10 bg-[#081321]/95 px-4 py-4 backdrop-blur sm:px-5">{footer}</footer> : null}
        </div>
      </aside>
    </div>
  );
}

export function AdminKeyValueGrid({ items, columns = 2 }: { items: Array<{ label: string; value: ReactNode }>; columns?: 1 | 2 | 3 }) {
  return (
    <div className={cn("grid gap-3", columns === 1 ? "grid-cols-1" : columns === 2 ? "md:grid-cols-2" : "md:grid-cols-3")}>
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
          <div className="text-[11px] uppercase tracking-[0.12em] text-[#70839B]">{item.label}</div>
          <div className="mt-2 text-sm font-medium text-[#F3F7FF]">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function AdminTimeline({ items }: { items: Array<{ id: string; title: string; subtitle?: string; meta?: string; tone?: "green" | "red" | "yellow" | "blue" | "neutral" }> }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
          <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", item.tone === "green" ? "bg-emerald-400" : item.tone === "red" ? "bg-rose-400" : item.tone === "yellow" ? "bg-amber-400" : item.tone === "blue" ? "bg-sky-400" : "bg-white/30")} />
          <div className="min-w-0">
            <div className="text-sm font-medium text-[#F3F7FF]">{item.title}</div>
            {item.subtitle ? <div className="mt-1 text-[13px] text-[#A3B5CB]">{item.subtitle}</div> : null}
            {item.meta ? <div className="mt-1 text-[12px] text-[#70839B]">{item.meta}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
