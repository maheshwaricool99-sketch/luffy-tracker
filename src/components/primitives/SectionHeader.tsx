import type { ReactNode } from "react";

export function SectionHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-semibold leading-8 text-[#F3F7FF]">{title}</h1>
        {subtitle ? <p className="mt-1 text-[13px] font-medium leading-[18px] text-[#A7B4C8]">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}
