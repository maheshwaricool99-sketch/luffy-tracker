import type { SkipReason } from "./types";

const RATE_LIMIT_MARKERS = ["429", "418", "too many", "rate limit", "forbidden", "restricted"];
const TIMEOUT_MARKERS = ["aborted", "timeout", "timed out"];
const UNAVAILABLE_MARKERS = ["unavailable", "503", "502", "500", "dns", "econnreset", "fetch failed"];
const PARSE_MARKERS = ["json", "parse", "unexpected token"];
const INVALID_RESPONSE_MARKERS = ["invalid", "nan", "undefined"];
const CANDLE_MARKERS = ["no candles", "candle", "age", "stale candle"];
const VOLUME_MARKERS = ["volume"];
const UNSUPPORTED_MARKERS = ["unsupported", "not found", "404"];

function hasMarker(message: string, markers: string[]) {
  return markers.some((marker) => message.includes(marker));
}

export function classifySkipReason(error: unknown): SkipReason {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (hasMarker(message, RATE_LIMIT_MARKERS)) return "rate_limited";
  if (hasMarker(message, TIMEOUT_MARKERS)) return "upstream_timeout";
  if (hasMarker(message, PARSE_MARKERS)) return "parsing_failure";
  if (hasMarker(message, INVALID_RESPONSE_MARKERS)) return "invalid_response";
  if (hasMarker(message, CANDLE_MARKERS)) return "no_fresh_candles";
  if (hasMarker(message, VOLUME_MARKERS)) return "stale_volume";
  if (hasMarker(message, UNSUPPORTED_MARKERS)) return "unsupported_instrument";
  if (hasMarker(message, UNAVAILABLE_MARKERS)) return "upstream_unavailable";
  return "max_attempt_threshold";
}
