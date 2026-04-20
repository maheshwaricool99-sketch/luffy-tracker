import { cn } from "@/lib/cn";

export function LockedValue({
  children,
  locked,
  label,
  className,
}: {
  children?: React.ReactNode;
  locked: boolean;
  label?: string;
  className?: string;
}) {
  if (!locked) {
    return <span className={cn("font-medium text-[#F3F7FF]", className)}>{children}</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1 text-[#70809A]", className)}>
      <span className="text-[10px]">🔒</span>
      <span>{label ?? "Locked"}</span>
    </span>
  );
}

export function LockedField({
  label,
  value,
  locked,
  teaser,
}: {
  label: string;
  value: React.ReactNode;
  locked: boolean;
  teaser?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.08em] text-[#70809A]">{label}</span>
      {locked ? (
        <span className="flex items-center gap-1 text-[12px] text-[#70809A]">
          <span>🔒</span>
          <span className="blur-[3px] select-none" aria-hidden>00.000</span>
          <span className="not-sr-only">{teaser ?? "Unlock"}</span>
        </span>
      ) : (
        <span className="text-[13px] font-medium text-[#F3F7FF]">{value}</span>
      )}
    </div>
  );
}
