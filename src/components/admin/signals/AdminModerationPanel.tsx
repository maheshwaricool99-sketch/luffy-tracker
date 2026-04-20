"use client";

import { useState } from "react";
import type { SignalDrawerDto } from "@/lib/signals/types/signalDtos";

export function AdminModerationPanel({ signal }: { signal: SignalDrawerDto | null }) {
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: "publish" | "unpublish" | "invalidate" | "disable") {
    if (!signal) return;
    const response = await fetch(`/api/admin/signals/${signal.id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: `Admin ${action} from moderation panel`, force: action === "publish" }),
    });
    const json = await response.json();
    setMessage(json.ok ? `${action} complete` : json.error ?? "action failed");
  }

  if (!signal) return null;
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-[#0B1728] p-4">
      <div className="text-[12px] uppercase tracking-[0.08em] text-[#70809A]">Moderation</div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => run("publish")} className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-[#F3F7FF]">Publish</button>
        <button type="button" onClick={() => run("unpublish")} className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-[#F3F7FF]">Unpublish</button>
        <button type="button" onClick={() => run("invalidate")} className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-[#F3F7FF]">Invalidate</button>
        <button type="button" onClick={() => run("disable")} className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-[#F3F7FF]">Disable</button>
      </div>
      {message ? <div className="text-[12px] text-[#70809A]">{message}</div> : null}
    </div>
  );
}
