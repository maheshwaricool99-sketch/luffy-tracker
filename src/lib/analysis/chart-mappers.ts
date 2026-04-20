import type { ChartCandle, ChartLinePoint } from "./types";

export function mapCandlesToSvgPoints(candles: ChartCandle[]) {
  if (candles.length === 0) return [];
  const max = Math.max(...candles.map((c) => c.high));
  const min = Math.min(...candles.map((c) => c.low));
  const range = Math.max(1e-8, max - min);
  return candles.map((candle, index) => ({
    index,
    openY: 1 - (candle.open - min) / range,
    closeY: 1 - (candle.close - min) / range,
    highY: 1 - (candle.high - min) / range,
    lowY: 1 - (candle.low - min) / range,
    bullish: candle.close >= candle.open,
  }));
}

export function mapLineToSvg(points: ChartLinePoint[], min: number, max: number) {
  const range = Math.max(1e-8, max - min);
  return points.map((point, index) => ({
    x: index,
    y: 1 - (point.value - min) / range,
  }));
}
