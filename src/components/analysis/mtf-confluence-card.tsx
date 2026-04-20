import { Card } from "@/components/ui/card";
import type { MtfConfluence } from "@/lib/analysis/types";

type Props = {
  mtf: MtfConfluence;
  entitlement: boolean;
};

function cellTone(label: "BULLISH" | "BEARISH" | "NEUTRAL") {
  if (label === "BULLISH") return "bg-emerald-400/15 text-emerald-200";
  if (label === "BEARISH") return "bg-rose-400/15 text-rose-200";
  return "bg-white/5 text-[var(--text-soft)]";
}

export function MtfConfluenceCard({ mtf, entitlement }: Props) {
  return (
    <Card title="MTF Confluence" subtitle={`Aligned ${mtf.alignedCount}/${mtf.totalCells} with aggregate verdict`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-xs">
          <thead>
            <tr className="text-[var(--text-muted)]">
              <th className="px-2 py-2 text-left">Metric</th>
              {mtf.rows[0]?.cells.map((cell) => (
                <th key={cell.timeframe} className="px-2 py-2 text-center">{cell.timeframe}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(entitlement ? mtf.rows : mtf.rows.filter((row) => row.metric === "trend")).map((row) => (
              <tr key={row.metric} className="border-t border-[var(--line)]">
                <td className="px-2 py-2 font-medium capitalize">{row.metric}</td>
                {row.cells.map((cell) => (
                  <td key={`${row.metric}-${cell.timeframe}`} className="px-2 py-2">
                    <div className={`rounded-md px-2 py-1 text-center ${cellTone(cell.signal)}`}>{cell.label}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!entitlement ? <p className="mt-3 text-xs text-[var(--text-muted)]">Upgrade to unlock full multi-timeframe matrix.</p> : null}
    </Card>
  );
}
