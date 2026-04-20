import { cn } from "@/lib/cn";
import { ReactNode } from "react";

type BadgeVariant = "bullish" | "bearish" | "premium" | "win" | "loss";

type BadgeProps = {
  variant: BadgeVariant;
  children?: ReactNode;
  className?: string;
};

const variantClasses: Record<BadgeVariant, string> = {
  bullish:
    "border-emerald-400/30 bg-emerald-400/15 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.25)]",
  bearish:
    "border-rose-400/35 bg-rose-400/15 text-rose-200 shadow-[0_0_18px_rgba(251,113,133,0.25)]",
  premium:
    "border-amber-300/35 bg-amber-300/12 text-amber-100 shadow-[0_0_18px_rgba(252,211,77,0.2)]",
  win: "border-cyan-400/35 bg-cyan-400/14 text-cyan-100",
  loss: "border-fuchsia-400/35 bg-fuchsia-400/14 text-fuchsia-100",
};

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
