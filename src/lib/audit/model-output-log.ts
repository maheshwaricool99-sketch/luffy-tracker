import type { MarketId } from "@/lib/market-data/shared/types";
import type { ModelOutput, SourceModel } from "@/lib/signals/signal-types";

type ModelOutputLogEntry = {
  symbol: string;
  market: MarketId;
  model: SourceModel;
  output: ModelOutput | null;
  accepted: boolean;
  reason?: string;
  timestamp: number;
};

const modelOutputLog: ModelOutputLogEntry[] = [];

export function recordModelOutput(entry: ModelOutputLogEntry) {
  modelOutputLog.push(entry);
  if (modelOutputLog.length > 2_000) modelOutputLog.shift();
}

export function getModelOutputLog() {
  return [...modelOutputLog];
}

export function clearModelOutputLog() {
  modelOutputLog.length = 0;
}
