import type { MarketId, MarketSymbolInfo } from "@/lib/market-data/shared/types";

const CURATED_CORE: Record<MarketId, string[]> = {
  crypto: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "LINKUSDT", "AVAXUSDT", "TRXUSDT"],
  us: ["SPY", "QQQ", "NVDA", "AAPL", "MSFT", "AMZN", "META", "GOOGL", "TSLA", "AMD"],
  india: ["RELIANCE", "TCS", "HDFCBANK", "ICICIBANK", "INFY", "SBIN", "LT", "ITC", "BHARTIARTL", "HINDUNILVR"],
};

const CURATED_PRIORITY: Record<MarketId, string[]> = {
  crypto: ["SUIUSDT", "INJUSDT", "ATOMUSDT", "TONUSDT", "UNIUSDT", "AAVEUSDT", "DOTUSDT", "FILUSDT", "ARBUSDT", "NEARUSDT", "OPUSDT", "LTCUSDT"],
  us: ["NFLX", "PLTR", "COIN", "MSTR", "SMCI", "TSM", "CRM", "UBER", "JPM", "BAC", "XOM", "AVGO", "MU", "INTC", "SOFI", "IWM"],
  india: ["AXISBANK", "KOTAKBANK", "BAJFINANCE", "MARUTI", "ASIANPAINT", "TITAN", "TATASTEEL", "WIPRO", "SUNPHARMA", "ULTRACEMCO", "TECHM", "INDUSINDBK"],
};

const CURATED_EXCLUSIONS: Record<MarketId, string[]> = {
  crypto: [],
  us: [],
  india: [],
};

const MANUAL_BOOST: Record<MarketId, string[]> = {
  crypto: [],
  us: [],
  india: [],
};

function dedupe(symbols: string[]) {
  return [...new Set(symbols)];
}

function normalizeSymbol(item: MarketSymbolInfo) {
  return item.symbol.toUpperCase();
}

function universeCap(market: MarketId) {
  if (market === "crypto") return 140;
  if (market === "us") return 120;
  return 100;
}

export function rankUniverseSymbols(market: MarketId, items: MarketSymbolInfo[]) {
  const available = new Set(items.map(normalizeSymbol));
  const excluded = new Set(CURATED_EXCLUSIONS[market].map((item) => item.toUpperCase()));
  const core = CURATED_CORE[market].filter((symbol) => available.has(symbol) && !excluded.has(symbol));
  const priority = CURATED_PRIORITY[market].filter((symbol) => available.has(symbol) && !excluded.has(symbol));
  const manualBoost = MANUAL_BOOST[market].filter((symbol) => available.has(symbol) && !excluded.has(symbol));
  const remainder = items
    .map(normalizeSymbol)
    .filter((symbol) => !excluded.has(symbol) && !core.includes(symbol) && !priority.includes(symbol) && !manualBoost.includes(symbol))
    .slice(0, Math.max(0, universeCap(market) - core.length - priority.length - manualBoost.length));

  return {
    core: dedupe(core),
    priority: dedupe([...manualBoost, ...priority]),
    extended: dedupe(remainder),
    manualBoost: dedupe(manualBoost),
    excluded: [...excluded],
  };
}
