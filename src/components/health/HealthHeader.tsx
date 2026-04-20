import type { HealthTimestamps, TrustPosture } from "@/lib/health/health-types";
import { HealthTimestamp } from "./HealthTimestamp";

type BadgeTone = "ok" | "info" | "warn" | "danger";

const POSTURE_BADGE: Record<TrustPosture, { label: string; tone: BadgeTone }> = {
  TRUSTED: { label: "Verified Telemetry", tone: "ok" },
  CAUTION: { label: "Caution — Some Degradation", tone: "info" },
  DEGRADED: { label: "Degraded — Auto-Recovery Active", tone: "warn" },
  UNRELIABLE: { label: "Unreliable — Manual Review", tone: "danger" },
};

const TONE_CLASSES: Record<BadgeTone, string> = {
  ok: "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300 [&_.dot]:bg-emerald-400",
  info: "border-[#5B8CFF]/25 bg-[#5B8CFF]/[0.08] text-[#8DB6FF] [&_.dot]:bg-[#5B8CFF]",
  warn: "border-amber-500/25 bg-amber-500/[0.08] text-amber-300 [&_.dot]:bg-amber-400",
  danger: "border-rose-500/25 bg-rose-500/[0.08] text-rose-300 [&_.dot]:bg-rose-400 [&_.dot]:animate-pulse",
};

export function HealthHeader({
  timestamps,
  posture,
  bootstrapping,
  recovering,
}: {
  timestamps: HealthTimestamps;
  posture: TrustPosture;
  bootstrapping?: boolean;
  recovering?: boolean;
}) {
  const primary = POSTURE_BADGE[posture] ?? POSTURE_BADGE.CAUTION;

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-[#F3F7FF] md:text-3xl">System Health</h1>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[#A7B4C8]">
          Real-time platform status, data integrity, scanner coverage, and signal reliability across all supported markets.
        </p>
      </div>

      <div className="flex flex-shrink-0 flex-col items-end gap-2">
        <div className="flex flex-wrap justify-end gap-2">
          <TrustBadge label={primary.label} tone={primary.tone} />
          {bootstrapping && <TrustBadge label="Bootstrapping" tone="info" />}
          {recovering && <TrustBadge label="Recovery In Progress" tone="warn" />}
        </div>
        <HealthTimestamp ts={timestamps.lastSystemUpdate} label="Last updated" className="text-[11px]" />
      </div>
    </div>
  );
}

function TrustBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${TONE_CLASSES[tone]}`}>
      <span className="dot h-1.5 w-1.5 rounded-full" />
      {label}
    </span>
  );
}
