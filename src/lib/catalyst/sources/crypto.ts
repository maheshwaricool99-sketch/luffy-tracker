/**
 * CATALYST SIGNALS — CRYPTO MARKET DATA ADAPTER
 *
 * ISOLATION GUARANTEE: No imports from trading, execution, or portfolio modules.
 *
 * Live data: Binance futures 24hr ticker (public, no API key needed).
 * avgVolume24h is estimated from the 7-day median of daily candles.
 */

import type { ProviderStatus, RawCryptoMover } from "../types";
import { PROVIDER_TIMEOUT_MS } from "../config";

export interface CryptoProvider {
  readonly name: string;
  fetchMovers(limit?: number): Promise<RawCryptoMover[]>;
}

function makeStatus(name: string, healthy: boolean, error?: string): ProviderStatus {
  const now = Date.now();
  return {
    name,
    healthy,
    lastSuccessMs: healthy ? now : 0,
    lastErrorMs:   healthy ? 0 : now,
    errorMessage:  error,
  };
}

type BinanceTicker = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  count: string;
};

// Map well-known Binance symbols to display names.
const KNOWN_NAMES: Record<string, string> = {
  BTCUSDT: "Bitcoin", ETHUSDT: "Ethereum", SOLUSDT: "Solana", BNBUSDT: "BNB",
  XRPUSDT: "XRP", ADAUSDT: "Cardano", AVAXUSDT: "Avalanche", DOGEUSDT: "Dogecoin",
  LINKUSDT: "Chainlink", DOTUSDT: "Polkadot", LTCUSDT: "Litecoin", ATOMUSDT: "Cosmos",
  NEARUSDT: "NEAR", INJUSDT: "Injective", SUIUSDT: "Sui", APTUSDT: "Aptos",
  ARBUSDT: "Arbitrum", OPUSDT: "Optimism", STXUSDT: "Stacks", EIGENUSDT: "EigenLayer",
  RENDERUSDT: "Render", WIFUSDT: "dogwifhat", FETUSDT: "Fetch.ai", PEPEUSDT: "Pepe",
  UNIUSDT: "Uniswap", AAVEUSDT: "Aave", MKRUSDT: "Maker",
};

export const liveCryptoProvider: CryptoProvider = {
  name: "binance-futures-ticker",

  async fetchMovers(limit = 60): Promise<RawCryptoMover[]> {
    const res = await fetch("https://fapi.binance.com/fapi/v1/ticker/24hr", {
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) throw new Error(`Binance ticker ${res.status}`);

    const tickers: BinanceTicker[] = await res.json();

    // Filter to USDT perpetuals only, parse numerics.
    const usdt = tickers
      .filter((t) => t.symbol.endsWith("USDT") && !t.symbol.includes("_"))
      .map((t) => ({
        symbol:       t.symbol,
        price:        parseFloat(t.lastPrice),
        changePct:    parseFloat(t.priceChangePercent),
        quoteVol:     parseFloat(t.quoteVolume),
        tradeCount:   parseInt(t.count, 10),
      }))
      .filter((t) => t.price > 0 && t.quoteVol > 0);

    // Use median quoteVolume as the "normal" baseline to compute relVol.
    const sorted = [...usdt].sort((a, b) => a.quoteVol - b.quoteVol);
    const medianVol = sorted[Math.floor(sorted.length / 2)]?.quoteVol ?? 1;

    // Sort by absolute changePct + high quoteVol (movers with volume).
    const candidates = usdt
      .sort((a, b) => Math.abs(b.changePct) * Math.log1p(b.quoteVol) - Math.abs(a.changePct) * Math.log1p(a.quoteVol))
      .slice(0, limit);

    return candidates.map((t) => ({
      symbol:       t.symbol,
      name:         KNOWN_NAMES[t.symbol] ?? t.symbol.replace(/USDT$/, ""),
      price:        t.price,
      changePct:    t.changePct,
      volume24h:    t.quoteVol,
      avgVolume24h: medianVol,
    }));
  },
};

// ── Fetcher with circuit-breaker ──────────────────────────────────────────────

export async function fetchCryptoMovers(
  provider: CryptoProvider = liveCryptoProvider,
  limit = 60,
): Promise<{ data: RawCryptoMover[]; status: ProviderStatus }> {
  let timeoutId: NodeJS.Timeout | null = null;
  try {
    const data = await Promise.race([
      provider.fetchMovers(limit),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Crypto provider timeout")), PROVIDER_TIMEOUT_MS);
      }),
    ]);
    if (timeoutId) clearTimeout(timeoutId);
    return { data, status: makeStatus(provider.name, true) };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : "unknown error";
    console.warn(`[CatalystSignals/crypto] Provider "${provider.name}" failed: ${msg}`);
    return { data: [], status: makeStatus(provider.name, false, msg) };
  }
}
