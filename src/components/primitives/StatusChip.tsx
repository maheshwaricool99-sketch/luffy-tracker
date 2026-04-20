import { cn } from "@/lib/cn";

type Tone = "green" | "red" | "yellow" | "blue" | "neutral";

const toneClasses: Record<Tone, string> = {
  green: "bg-[#19C37D]/15 text-[#19C37D] ring-1 ring-inset ring-[#19C37D]/25",
  red: "bg-[#F04452]/15 text-[#F04452] ring-1 ring-inset ring-[#F04452]/25",
  yellow: "bg-[#F5B942]/15 text-[#F5B942] ring-1 ring-inset ring-[#F5B942]/25",
  blue: "bg-[#5B8CFF]/15 text-[#5B8CFF] ring-1 ring-inset ring-[#5B8CFF]/25",
  neutral: "bg-white/[0.06] text-[#A7B4C8] ring-1 ring-inset ring-white/10",
};

export function StatusChip({ label, tone = "neutral", className }: { label: string; tone?: Tone; className?: string }) {
  return (
    <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold", toneClasses[tone], className)}>
      {label}
    </span>
  );
}
