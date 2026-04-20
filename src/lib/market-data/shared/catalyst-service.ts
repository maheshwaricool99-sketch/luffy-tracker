import type { CatalystRow, MarketId } from "./types";
import { getMarketSymbols, getSnapshot } from "./price-service";
import { getStructureMetrics } from "./structure-service";
import { getVolumeMetrics } from "./volume-service";
import { clamp, hashSeed } from "./utils";

function stageFromMove(movePct: number): CatalystRow["stage"] {
  if (Math.abs(movePct) >= 8) return "LATE";
  if (Math.abs(movePct) >= 5) return "ACTIVE";
  if (Math.abs(movePct) >= 2) return "DEVELOPING";
  return "EARLY";
}

export async function getCatalystRows(marketId: MarketId): Promise<CatalystRow[]> {
  const symbols = (await getMarketSymbols(marketId)).slice(0, marketId === "crypto" ? 30 : 50);

  const rows = await Promise.all(symbols.map(async (item) => {
    try {
      const snapshot = await getSnapshot(item.symbol, marketId);
      const structure = await getStructureMetrics(item.symbol, marketId);
      const volume = await getVolumeMetrics(item.symbol, marketId);
      const seed = hashSeed(`${marketId}:${item.symbol}:catalyst`);
      const movedPct = structure.movePct;
      const freshness = snapshot.freshness;
      const stage = stageFromMove(movedPct);
      const sentiment = Math.round(clamp(10, 95, 48 + (seed % 35)));
      const catalystScore = Math.round(clamp(0, 100,
        32 +
        structure.structureScore +
        volume.anomalyScore +
        (freshness === "GOOD" ? 18 : freshness === "OK" ? 10 : 0) -
        (Math.abs(movedPct) > 8 ? 20 : Math.abs(movedPct) > 5 ? 10 : 0),
      ));
      return {
        symbol: item.symbol,
        marketId,
        catalystScore,
        type: marketId === "india" ? "opening-range / relative-strength" : marketId === "crypto" ? "flow / narrative" : "earnings / rotation",
        freshness,
        sentiment,
        movedPct: Number(movedPct.toFixed(2)),
        stage,
        reason: `${item.symbol} shows ${volume.ratio.toFixed(1)}x volume with ${Math.abs(movedPct).toFixed(2)}% move and ${freshness.toLowerCase()} price freshness.`,
      } satisfies CatalystRow;
    } catch {
      return null;
    }
  }));

  return rows.filter((row): row is CatalystRow => Boolean(row)).sort((a, b) => b.catalystScore - a.catalystScore);
}
