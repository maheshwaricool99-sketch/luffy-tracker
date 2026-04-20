import type { MarketId } from "../shared/types";

const PRIORITY: Record<MarketId, string[]> = {
  crypto: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BNBUSDT", "ADAUSDT", "DOGEUSDT", "LINKUSDT", "AVAXUSDT", "SUIUSDT"],
  us: ["SPY", "QQQ", "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "AMD", "GOOGL", "XOM", "JPM"],
  india: ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "LT", "ITC", "HINDUNILVR", "AXISBANK", "BAJFINANCE"],
};

export function getPriorityUniverse(market: MarketId) {
  return PRIORITY[market];
}
