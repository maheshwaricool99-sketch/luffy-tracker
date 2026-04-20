import type { ReliabilityInfo } from "@/lib/health/health-types";
import { cn } from "@/lib/cn";

const LABEL_DISPLAY: Record<string, { text: string; color: string; ring: string }> = {
  high_confidence: { text: "High Confidence", color: "text-emerald-400", ring: "stroke-emerald-500" },
  use_caution: { text: "Use Caution", color: "text-amber-400", ring: "stroke-amber-500" },
  not_reliable: { text: "Not Reliable", color: "text-rose-400", ring: "stroke-rose-500" },
};

const BREAKDOWN_LABELS: Record<string, string> = {
  freshness: "Freshness",
  dataIntegrity: "Data Integrity",
  coverage: "Coverage",
  executionReadiness: "Execution Readiness",
  macroStability: "Macro Stability",
  providerQuality: "Provider Quality",
};

function ScoreRing({ score }: { score: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;
  const color = score >= 8.5 ? "#10b981" : score >= 6.5 ? "#f59e0b" : "#f43f5e";

  return (
    <div className="relative flex h-[120px] w-[120px] items-center justify-center">
      <svg className="-rotate-90" width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[28px] font-bold tabular-nums text-[#F3F7FF]">{score.toFixed(1)}</span>
        <span className="text-[10px] text-[#70809A]">/ 10</span>
      </div>
    </div>
  );
}

function SubscoreBar({ label, score, className }: { label: string; score: number; className?: string }) {
  const color = score >= 8 ? "bg-emerald-500" : score >= 6 ? "bg-amber-500" : "bg-rose-500";
  const textColor = score >= 8 ? "text-emerald-400" : score >= 6 ? "text-amber-400" : "text-rose-400";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="w-36 flex-shrink-0 text-[12px] text-[#A7B4C8]">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${(score / 10) * 100}%` }}
        />
      </div>
      <span className={cn("w-8 text-right text-[12px] font-semibold tabular-nums", textColor)}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

export function SignalReliabilityCard({ reliability }: { reliability: ReliabilityInfo }) {
  const labelInfo = LABEL_DISPLAY[reliability.label] ?? LABEL_DISPLAY.use_caution;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0B1728] p-5 md:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-semibold text-[#F3F7FF]">Signal Reliability</h2>
          <p className="mt-0.5 text-[12px] text-[#70809A]">Current signal trustworthiness index</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* Score ring */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <ScoreRing score={reliability.score} />
          <span className={cn("text-[13px] font-semibold", labelInfo.color)}>{labelInfo.text}</span>
        </div>

        {/* Right side */}
        <div className="flex-1 min-w-0">
          <p className="mb-5 text-[13px] leading-relaxed text-[#A7B4C8]">{reliability.explanation}</p>

          {/* Subscore breakdown */}
          <div className="space-y-3">
            {(Object.entries(reliability.breakdown) as [string, number][]).map(([key, score]) => (
              <SubscoreBar
                key={key}
                label={BREAKDOWN_LABELS[key] ?? key}
                score={score}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
