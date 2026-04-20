import type { ConfidenceBucket } from "@/lib/signals/types/signalEnums";
import { cn } from "@/lib/cn";

const BUCKET_STYLES: Record<ConfidenceBucket, string> = {
  ELITE: "border-emerald-500/35 bg-emerald-500/15 text-emerald-300",
  STRONG: "border-blue-500/35 bg-blue-500/15 text-blue-300",
  GOOD: "border-amber-500/35 bg-amber-500/15 text-amber-300",
  WEAK: "border-white/10 bg-white/[0.04] text-[#70809A]",
};

export function ConfidencePill({
  bucket,
  score,
  size = "sm",
}: {
  bucket: ConfidenceBucket;
  score?: number;
  size?: "xs" | "sm";
}) {
  const sizeClass = size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border font-semibold", sizeClass, BUCKET_STYLES[bucket])}>
      {score != null ? `${score}%` : bucket}
    </span>
  );
}

export function confidenceColor(bucket: ConfidenceBucket): string {
  switch (bucket) {
    case "ELITE": return "text-emerald-400";
    case "STRONG": return "text-blue-400";
    case "GOOD": return "text-amber-400";
    default: return "text-[#70809A]";
  }
}
