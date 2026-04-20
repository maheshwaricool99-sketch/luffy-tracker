import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function IconButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={cn("flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.04] text-sm font-semibold text-[#F3F7FF] hover:bg-white/[0.06]", props.className)} />;
}
