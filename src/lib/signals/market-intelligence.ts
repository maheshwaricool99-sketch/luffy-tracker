import type { MarketId } from "@/lib/market-data/shared/types";
import { getCatalystRows } from "@/lib/market-data/shared/catalyst-service";
import { getPredictionSignals } from "@/lib/prediction-engine/service";

export async function getMarketIntelligence(marketId: MarketId) {
  const [catalysts, predictions] = await Promise.all([
    getCatalystRows(marketId),
    getPredictionSignals(marketId),
  ]);
  return { marketId, catalysts, predictions };
}
