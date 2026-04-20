import type { ReactNode } from "react";

export function SignalsLayout({
  pulse,
  filters,
  table,
  drawer,
  footer,
}: {
  pulse: ReactNode;
  filters: ReactNode;
  table: ReactNode;
  drawer: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="space-y-4">
      {pulse}
      {filters}
      {/* On mobile: stacked. On xl: side-by-side with detail drawer */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),380px]">
        <div className="min-w-0 space-y-4">{table}</div>
        {/* Drawer: full width on mobile, right column on xl */}
        <div className="min-w-0">{drawer}</div>
      </div>
      {footer}
    </div>
  );
}
