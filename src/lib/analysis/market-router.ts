import { STATIC_SYMBOLS } from "@/config/symbols";
import type { Market } from "./types";

const CRYPTO = new Set(STATIC_SYMBOLS.map((item) => item.toUpperCase()));
const US = new Set([
  "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "SPY", "QQQ", "GOOGL", "AMD", "JPM", "XOM",
]);
const INDIA = new Set([
  "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "LT", "ITC", "HINDUNILVR", "AXISBANK", "BAJFINANCE",
]);

export function detectMarket(symbol: string): Market | null {
  const norm = symbol.toUpperCase().trim();
  if (CRYPTO.has(norm)) return "CRYPTO";
  if (US.has(norm)) return "US";
  if (INDIA.has(norm)) return "INDIA";
  if (/USDT$/.test(norm)) return "CRYPTO";
  return null;
}

export function marketExchange(market: Market): string {
  if (market === "CRYPTO") return "Binance";
  if (market === "US") return "NASDAQ";
  return "NSE";
}
