import type { PriceSnapshot } from "@/lib/market-data/shared/types";
import type { CandlePoint } from "@/lib/market-data/shared/candle-service";
import { getLiquidityRegime } from "./liquidity-regime";
import { getTrendRegime } from "./trend-regime";
import { getVolatilityRegime } from "./volatility-regime";

export function getRegimeContext(candles: CandlePoint[], snapshot: PriceSnapshot) {
  return {
    trend: getTrendRegime(candles),
    volatility: getVolatilityRegime(candles),
    liquidity: getLiquidityRegime(candles, snapshot.bid, snapshot.ask),
  };
}
