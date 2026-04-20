"use client";

import type { ReactNode } from "react";

export type EngineAction = {
  key: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  pending?: boolean;
  title?: string;
};

export function EngineActionBar({ actions, trailing }: { actions: EngineAction[]; trailing?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => (
        <button
          key={a.key}
          type="button"
          onClick={a.onClick}
          disabled={a.disabled || a.pending}
          title={a.title}
          className={
            a.danger
              ? "rounded-xl border border-rose-400/25 bg-rose-400/10 px-3.5 py-2 text-[13px] font-semibold text-rose-100 hover:bg-rose-400/20 disabled:opacity-60"
              : "rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[13px] font-semibold text-[#F3F7FF] hover:bg-white/[0.07] disabled:opacity-60"
          }
        >
          {a.pending ? "Working…" : a.label}
        </button>
      ))}
      {trailing}
    </div>
  );
}
