import { cn } from "@/lib/cn";

type TableProps = {
  headers: string[];
  rows?: string[][];
  className?: string;
};

export function Table({ headers, rows = [], className }: TableProps) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-[var(--line)]", className)}>
      <table className="w-full border-collapse text-left text-[13px]">
        <thead className="bg-white/[0.03] text-[var(--text-soft)]">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-2.5 font-medium uppercase tracking-[0.08em]">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, index) => (
              <tr key={`row-${index}`} className="border-t border-[var(--line)] text-[var(--text-strong)] hover:bg-white/[0.03]">
                {row.map((cell, cellIndex) => (
                  <td key={`cell-${index}-${cellIndex}`} className="px-4 py-2.5 text-[13px] text-[var(--text-soft)]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr className="border-t border-[var(--line)]">
              <td colSpan={headers.length} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                Empty state
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
