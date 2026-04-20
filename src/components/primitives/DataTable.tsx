import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DataColumn<T> = {
  key: string;
  label: string;
  width?: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage,
  selectedKey,
  scrollMode = "page",
  cardRender,
  tableMinWidth,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage: string;
  selectedKey?: string;
  scrollMode?: "page" | "panel";
  cardRender?: (row: T) => ReactNode;
  tableMinWidth?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B1728]">
      {cardRender ? (
        <div className="grid gap-3 p-3 md:hidden">
          {rows.length > 0 ? rows.map((row) => (
            <div key={rowKey(row)}>
              {cardRender(row)}
            </div>
          )) : (
            <div className="px-4 py-8 text-center text-[13px] font-medium text-[#70809A]">
              {emptyMessage}
            </div>
          )}
        </div>
      ) : null}
      <div className={cn(scrollMode === "panel" ? "max-h-full overflow-auto" : "overflow-x-auto", cardRender && "hidden md:block")}>
        <table
          className="min-w-full border-collapse text-[13px] font-medium text-[#A7B4C8]"
          style={tableMinWidth ? { minWidth: tableMinWidth } : undefined}
        >
          <thead className="sticky top-0 z-10 h-11 border-b border-white/10 bg-[#0F1D31]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn("px-3 text-left text-[12px] font-medium uppercase tracking-[0.08em] text-[#70809A]", column.align === "right" && "text-right")}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = rowKey(row);
              return (
                <tr key={key} data-selected={selectedKey === key} className="h-[52px] border-b border-white/[0.05] hover:bg-white/[0.025] data-[selected=true]:bg-[#5B8CFF]/10">
                  {columns.map((column) => (
                    <td key={column.key} className={cn("px-3 align-middle", column.align === "right" && "text-right tabular-nums text-[#F3F7FF]")}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-[13px] font-medium text-[#70809A]">
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
