import { normalizeModelOutput } from "@/lib/models/model-normalizer";

describe("model-normalizer", () => {
  it("clamps invalid ranges into the required 0-100 bounds", () => {
    const result = normalizeModelOutput({
      symbol: "BTCUSDT",
      market: "crypto",
      direction: "long",
      strength: 140,
      confidence: -12,
      timestamp: Date.now(),
      features: {
        structure: 130,
        momentum: -5,
      },
      meta: {
        sourceModel: "continuation_model",
      },
    });

    expect(result).not.toBeNull();
    expect(result?.strength).toBe(100);
    expect(result?.confidence).toBe(0);
    expect(result?.features.structure).toBe(100);
    expect(result?.features.momentum).toBe(0);
  });

  it("rejects output with invalid timestamp", () => {
    const result = normalizeModelOutput({
      symbol: "BTCUSDT",
      market: "crypto",
      direction: "long",
      strength: 80,
      confidence: 80,
      timestamp: 0,
      features: {},
      meta: {
        sourceModel: "breakout_model",
      },
    });

    expect(result).toBeNull();
  });
});
