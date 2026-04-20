import type { AnalysisChartData } from "@/lib/analysis/types";
import { formatPrice } from "@/lib/analysis/formatters";

type Props = {
  chart: AnalysisChartData;
};

export function ChartLegend({ chart }: Props) {
  const last = chart.candles.at(-1);
  if (!last) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-soft)]">
      <span>O {formatPrice(last.open)}</span>
      <span>H {formatPrice(last.high)}</span>
      <span>L {formatPrice(last.low)}</span>
      <span>C {formatPrice(last.close)}</span>
      <span>Vol {last.volume?.toLocaleString() ?? "—"}</span>
    </div>
  );
}
