import { mapCandlesToSvgPoints, mapLineToSvg } from "@/lib/analysis/chart-mappers";

describe("analysis chart mappers", () => {
  it("maps candles to normalized svg coordinates", () => {
    const mapped = mapCandlesToSvgPoints([
      { time: 1, open: 100, high: 110, low: 95, close: 105, volume: 10 },
      { time: 2, open: 105, high: 112, low: 102, close: 103, volume: 12 },
    ]);
    expect(mapped).toHaveLength(2);
    expect(mapped[0].bullish).toBe(true);
    expect(mapped[1].bullish).toBe(false);
    expect(mapped.every((point) => point.highY <= point.lowY)).toBe(true);
  });

  it("maps line points into 0..1 space", () => {
    const mapped = mapLineToSvg([
      { time: 1, value: 100 },
      { time: 2, value: 120 },
      { time: 3, value: 110 },
    ], 100, 120);

    expect(mapped).toHaveLength(3);
    expect(mapped[0].y).toBe(1);
    expect(mapped[1].y).toBe(0);
  });
});
