import type { AiAnalysisResponse, FeedState } from "./types";
import { VERDICT_LABELS } from "./constants";

export function verdictLabel(verdict: AiAnalysisResponse["decisionEngine"]["verdict"]) {
  return VERDICT_LABELS[verdict];
}

export function isFeedStale(feed: FeedState) {
  return feed.status === "STALE";
}

export function isAnalysisStale(payload: AiAnalysisResponse) {
  return Object.values(payload.freshness).some((feed) => feed.status === "STALE");
}
