"use client";

import { useState } from "react";
import type { SignalDrawerDto } from "@/lib/signals/types/signalDtos";
import { cn } from "@/lib/cn";

async function toggleWatchlist(signalId: string, current: boolean): Promise<boolean> {
  const res = await fetch(`/api/signals/${signalId}/watchlist`, {
    method: current ? "DELETE" : "POST",
  });
  return res.ok;
}

export function SignalActions({ signal }: { signal: SignalDrawerDto }) {
  const [watchlisted, setWatchlisted] = useState(signal.isWatchlisted ?? false);
  const [watchPending, setWatchPending] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleWatchlist = async () => {
    setWatchPending(true);
    const ok = await toggleWatchlist(signal.id, watchlisted);
    if (ok) setWatchlisted((w) => !w);
    setWatchPending(false);
  };

  const handleCopy = async () => {
    const text = `${signal.symbol} ${signal.direction} | Confidence: ${signal.confidenceScore}% | ${signal.rationaleSnippet ?? ""}`;
    await navigator.clipboard.writeText(text.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0B1728] p-4 md:p-5">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#70809A]">Actions</h3>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleWatchlist}
          disabled={watchPending}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-medium transition-colors",
            watchlisted
              ? "border-[#5B8CFF]/40 bg-[#5B8CFF]/10 text-[#5B8CFF]"
              : "border-white/[0.08] text-[#70809A] hover:border-white/15 hover:text-[#A7B4C8]",
          )}
        >
          <span>{watchlisted ? "★" : "☆"}</span>
          <span>{watchlisted ? "Watching" : "Watch"}</span>
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-[12px] font-medium text-[#70809A] transition-colors hover:border-white/15 hover:text-[#A7B4C8]"
        >
          <span>{copied ? "✓" : "⎘"}</span>
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>

        {signal.isPremiumLocked && (
          <a
            href="/pricing"
            className="flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[12px] font-semibold text-amber-400 transition-colors hover:bg-amber-400/15"
          >
            <span>🔒</span>
            <span>Unlock Premium</span>
          </a>
        )}
      </div>
    </div>
  );
}
