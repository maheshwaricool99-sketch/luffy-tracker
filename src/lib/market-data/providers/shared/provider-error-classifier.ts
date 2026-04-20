import { MarketDataError } from "@/lib/market-data/core/errors";
import type { MarketDataErrorCode } from "@/lib/market-data/core/enums";

export function classifyProviderError(error: unknown): MarketDataError {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  const code: MarketDataErrorCode =
    lower.includes("timeout") || lower.includes("aborted") ? "PROVIDER_TIMEOUT" :
    lower.includes("429") || lower.includes("rate") ? "PROVIDER_RATE_LIMIT" :
    lower.includes("401") || lower.includes("403") || lower.includes("auth") ? "PROVIDER_AUTH_FAILURE" :
    lower.includes("parse") || lower.includes("json") ? "PROVIDER_INVALID_RESPONSE" :
    lower.includes("partial") ? "PROVIDER_PARTIAL_DATA" :
    "PROVIDER_UNAVAILABLE";
  return new MarketDataError(code, message, !["PROVIDER_AUTH_FAILURE"].includes(code));
}
