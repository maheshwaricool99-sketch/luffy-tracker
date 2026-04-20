import type { ReactNode } from "react";
import { Panel } from "./Panel";

export function StatCard({
  label,
  value,
  meta,
  tone,
}: {
  label: string;
  value: string;
  meta?: ReactNode;
  tone?: ReactNode;
}) {
  return (
    <Panel bodyClassName="flex h-24 flex-col justify-between p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#70809A]">{label}</span>
        {tone}
      </div>
      <div>
        <div className="text-[24px] font-bold leading-7 text-[#F3F7FF]">{value}</div>
        {meta ? <div className="mt-1 text-[12px] font-medium leading-4 text-[#A7B4C8]">{meta}</div> : null}
      </div>
    </Panel>
  );
}
