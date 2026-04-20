import type { SignalDrawerDto } from "@/lib/signals/types/signalDtos";
import type { SignalLifecycleStepDto } from "@/lib/signals/types/signalDtos";
import { cn } from "@/lib/cn";

const STEP_COLORS = {
  DONE: { dot: "bg-emerald-500", line: "bg-emerald-500/30", label: "text-[#A7B4C8]", time: "text-emerald-400/80" },
  CURRENT: { dot: "bg-[#5B8CFF] ring-2 ring-[#5B8CFF]/30", line: "bg-white/[0.06]", label: "text-[#F3F7FF] font-semibold", time: "text-[#5B8CFF]" },
  PENDING: { dot: "bg-white/10", line: "bg-white/[0.04]", label: "text-[#4A5568]", time: "text-[#4A5568]" },
};

function formatStepTime(at: string | null): string {
  if (!at) return "";
  const d = new Date(at);
  return d.toLocaleTimeString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function TimelineStep({ step, isLast }: { step: SignalLifecycleStepDto; isLast: boolean }) {
  const colors = STEP_COLORS[step.state];
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={cn("mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full", colors.dot)} />
        {!isLast && <div className={cn("my-1 w-px flex-1", colors.line)} />}
      </div>
      <div className={cn("pb-3", isLast ? "" : "")}>
        <div className={cn("text-[12px]", colors.label)}>{step.label}</div>
        {step.at && (
          <div className={cn("text-[10px]", colors.time)}>{formatStepTime(step.at)}</div>
        )}
      </div>
    </div>
  );
}

export function SignalLifecycleTimeline({ signal }: { signal: SignalDrawerDto }) {
  const { lifecycle, isPremiumLocked } = signal;
  if (!lifecycle || lifecycle.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0B1728] p-4 md:p-5">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#70809A]">Signal Lifecycle</h3>
      {isPremiumLocked ? (
        <div className="rounded-xl border border-amber-400/10 bg-amber-400/[0.04] p-3">
          <p className="text-[12px] text-amber-400/80">Full lifecycle timeline is available on Premium.</p>
        </div>
      ) : (
        <div>
          {lifecycle.map((step, i) => (
            <TimelineStep key={step.key} step={step} isLast={i === lifecycle.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}
