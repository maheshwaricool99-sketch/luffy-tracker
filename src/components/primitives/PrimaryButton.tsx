import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={cn("h-10 rounded-xl bg-[#5B8CFF] px-3.5 text-sm font-semibold text-white hover:bg-[#6A97FF]", props.className)} />;
}
