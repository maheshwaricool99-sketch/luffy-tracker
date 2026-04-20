import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-[#F3F7FF] outline-none focus:border-[#5B8CFF]/50 focus:ring-1 focus:ring-[#5B8CFF]/40",
        props.className,
      )}
    />
  );
}
