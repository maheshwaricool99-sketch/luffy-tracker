export const FRESHNESS = ["LIVE", "DELAYED", "CACHED", "RESTORED_SNAPSHOT", "STALE", "UNAVAILABLE"] as const;
export type Freshness = (typeof FRESHNESS)[number];

export const SOURCE_STATES = ["LIVE_PROVIDER", "DELAYED_FEED", "SNAPSHOT", "CACHED"] as const;
export type SourceState = (typeof SOURCE_STATES)[number];

export function mapScannerStateToFreshness(input: string, restored = false): Freshness {
  if (restored) return "RESTORED_SNAPSHOT";
  switch (input) {
    case "live":
      return "LIVE";
    case "delayed":
      return "DELAYED";
    case "cached":
      return "CACHED";
    case "stale":
      return "STALE";
    default:
      return "UNAVAILABLE";
  }
}

export function mapScannerStateToSourceState(input: string): SourceState {
  switch (input) {
    case "live":
      return "LIVE_PROVIDER";
    case "delayed":
      return "DELAYED_FEED";
    case "cached":
      return "CACHED";
    default:
      return "SNAPSHOT";
  }
}

export function isLiveLikeFreshness(freshness: Freshness) {
  return freshness === "LIVE" || freshness === "DELAYED";
}
