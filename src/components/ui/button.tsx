import { cn } from "@/lib/cn";
import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "border border-sky-400/45 bg-sky-500/16 text-sky-100 hover:border-sky-300/70 hover:bg-sky-500/28",
  secondary:
    "border border-[var(--line)] bg-[var(--surface-alt)] text-[var(--text-strong)] hover:border-[var(--line-strong)] hover:bg-white/[0.08]",
  ghost: "border border-transparent text-[var(--text-soft)] hover:bg-white/[0.08] hover:text-white",
};

export function Button({ variant = "secondary", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-8.5 items-center justify-center rounded-lg px-3.5 text-[12px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] active:scale-[0.98]",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
