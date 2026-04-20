import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function SecondaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={cn("h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-[#F3F7FF] hover:bg-white/[0.06]", props.className)} />;
}
