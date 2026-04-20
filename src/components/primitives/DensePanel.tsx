import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function DensePanel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl border border-white/10 bg-[#0B1728] p-3", className)}>{children}</section>;
}
