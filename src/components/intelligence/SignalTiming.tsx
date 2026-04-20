import { useEffect, useState } from "react";
import type { IntelligenceSignalStatus } from "@/lib/intelligence/types";

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtAge(iso: string, nowMs: number) {
  if (nowMs <= 0) return "—";
  const diffMs = nowMs - new Date(iso).getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

function UrgencyLabel({ status, generatedAt, nowMs }: { status: IntelligenceSignalStatus; generatedAt: string; nowMs: number }) {
  if (nowMs <= 0) return <span className="text-[11px] text-[#A7B4C8]">Evaluating freshness…</span>;
  const ageMs = nowMs - new Date(generatedAt).getTime();
  const ageMin = ageMs / 60_000;

  if (status === "STALE" || status === "EXPIRED") {
    return <span className="text-[11px] text-amber-400">Opportunity aging — reduced edge</span>;
  }
  if (status === "BLOCKED") {
    return <span className="text-[11px] text-rose-400">Publish blocked — monitoring</span>;
  }
  if (ageMin < 5) {
    return <span className="text-[11px] text-emerald-400 font-semibold">Fresh — within action window</span>;
  }
  if (ageMin < 30) {
    return <span className="text-[11px] text-[#A7B4C8]">Still valid — monitor for trigger</span>;
  }
  return <span className="text-[11px] text-amber-400">Late-stage setup — verify still valid</span>;
}

interface SignalTimingProps {
  generatedAt: string;
  confirmedAt: string | null;
  status: IntelligenceSignalStatus;
  compact?: boolean;
}

export function SignalTiming({ generatedAt, confirmedAt, status, compact }: SignalTimingProps) {
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-4 pb-3">
        <span className="text-[11px] text-[#70809A]">{fmtTime(generatedAt)}</span>
        <span className="text-[#70809A]">·</span>
        <span className="text-[11px] text-[#70809A]">{fmtAge(generatedAt, nowMs)} old</span>
        <span className="text-[#70809A]">·</span>
        <UrgencyLabel status={status} generatedAt={generatedAt} nowMs={nowMs} />
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-b border-white/[0.05]">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#70809A]">Timing</div>
      <div className="space-y-1 mb-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-[#70809A]">Generated</span>
          <span className="text-[11px] tabular-nums text-[#A7B4C8]">{fmtTime(generatedAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-[#70809A]">Age</span>
          <span className="text-[11px] tabular-nums text-[#A7B4C8]">{fmtAge(generatedAt, nowMs)}</span>
        </div>
        {confirmedAt && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-[#70809A]">Last Confirmed</span>
            <span className="text-[11px] tabular-nums text-[#A7B4C8]">{fmtAge(confirmedAt, nowMs)} ago</span>
          </div>
        )}
      </div>
      <UrgencyLabel status={status} generatedAt={generatedAt} nowMs={nowMs} />
    </div>
  );
}
