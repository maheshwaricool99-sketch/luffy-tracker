import { detectMarket, marketExchange } from "@/lib/analysis/market-router";

describe("analysis market router", () => {
  it("detects crypto symbols", () => {
    expect(detectMarket("BTCUSDT")).toBe("CRYPTO");
    expect(detectMarket("ETHUSDT")).toBe("CRYPTO");
  });

  it("detects US and India symbols", () => {
    expect(detectMarket("AAPL")).toBe("US");
    expect(detectMarket("RELIANCE")).toBe("INDIA");
  });

  it("returns null for unknown symbols", () => {
    expect(detectMarket("UNKNOWN123")).toBeNull();
  });

  it("maps market to exchange", () => {
    expect(marketExchange("CRYPTO")).toBe("Binance");
    expect(marketExchange("US")).toBe("NASDAQ");
    expect(marketExchange("INDIA")).toBe("NSE");
  });
});
