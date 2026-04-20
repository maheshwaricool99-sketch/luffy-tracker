import type { AnalysisChartData } from "@/lib/analysis/types";

type Props = {
  chart: AnalysisChartData;
  visible: boolean;
};

export function ChartAnnotationLayer({ chart, visible }: Props) {
  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {chart.annotations.slice(0, 4).map((annotation, index) => (
        <div
          key={annotation.id}
          className="absolute rounded-md border border-[var(--line)] bg-[var(--surface-alt)] px-2 py-1 text-[10px] text-[var(--text-soft)]"
          style={{ top: `${12 + index * 16}%`, right: `${4 + index * 3}%` }}
        >
          {annotation.label ?? annotation.type}
        </div>
      ))}
    </div>
  );
}
