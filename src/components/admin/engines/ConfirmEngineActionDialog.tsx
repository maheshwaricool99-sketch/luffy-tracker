"use client";

import { useState } from "react";

export type ConfirmSpec = {
  title: string;
  body: string;
  confirmLabel: string;
  tone?: "default" | "danger";
  typedConfirm?: string;
};

export function ConfirmEngineActionDialog({
  open,
  spec,
  onConfirm,
  onCancel,
  pending,
}: {
  open: boolean;
  spec: ConfirmSpec | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");
  if (!open || !spec) return null;
  const typedOk = !spec.typedConfirm || typed.trim() === spec.typedConfirm;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0B1728] p-5 shadow-2xl">
        <h3 className="text-[18px] font-semibold text-[#F5FAFF]">{spec.title}</h3>
        <p className="mt-2 text-[14px] leading-6 text-[#A3B5CB]">{spec.body}</p>

        <label className="mt-4 block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#70839B]">
          Reason (optional)
        </label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why are you running this action?"
          className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-[#0F1D31] px-3 text-sm text-[#F3F7FF] outline-none placeholder:text-[#70809A]"
        />

        {spec.typedConfirm ? (
          <>
            <label className="mt-4 block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#70839B]">
              Type <span className="text-[#F3F7FF]">{spec.typedConfirm}</span> to confirm
            </label>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-[#0F1D31] px-3 text-sm text-[#F3F7FF] outline-none"
            />
          </>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setTyped("");
              setReason("");
              onCancel();
            }}
            disabled={pending}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-[#D3DCEA] hover:bg-white/[0.06] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const nextReason = reason;
              setTyped("");
              setReason("");
              onConfirm(nextReason);
            }}
            disabled={pending || !typedOk}
            className={
              spec.tone === "danger"
                ? "rounded-xl border border-rose-400/30 bg-rose-400/15 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-400/25 disabled:opacity-60"
                : "rounded-xl border border-[#5B8CFF]/35 bg-[#5B8CFF]/15 px-4 py-2 text-sm font-semibold text-[#F3F7FF] hover:bg-[#5B8CFF]/25 disabled:opacity-60"
            }
          >
            {pending ? "Working…" : spec.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
