import type { MarketId } from "@/lib/market-data/shared/types";

export type SignalClassification = "STRONG_SIGNAL" | "DEVELOPING" | "EARLY" | "IGNORE";
export type SignalDirection = "LONG" | "SHORT" | "NONE";
export type SetupType = "BREAKOUT" | "REVERSAL" | "ACCUMULATION";

export type ScoreBreakdown = {
  structure: number;
  volume: number;
  momentum: number;
  whale: number | null;
  derivatives: number | null;
  final: number;
};

export type SignalDecision = {
  direction: SignalDirection;
  confidence: number;
  setupType: SetupType;
  reason: string;
};

export type MarketSignal = {
  symbol: string;
  name: string;
  marketId: MarketId;
  price: number;
  signalScore: number;
  classification: SignalClassification;
  breakdown: ScoreBreakdown;
  decision: SignalDecision;
  scannedAtMs: number;
  priceSource: string;
  movePct: number;
  error?: string;
};

export type MarketBias = {
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  bullishCount: number;
  bearishCount: number;
  noneCount: number;
  totalScanned: number;
};

export type SignalLogEntry = {
  ts: number;
  symbol: string;
  classification: SignalClassification;
  direction: SignalDirection;
  score: number;
  reason: string;
};

export type ScannerSnapshot = {
  signals: MarketSignal[];
  topOpportunities: MarketSignal[];
  marketBias: MarketBias;
  lastScanMs: number;
  scanCount: number;
  totalSymbolsScanned: number;
  healthy: boolean;
  signalLog: SignalLogEntry[];
};
