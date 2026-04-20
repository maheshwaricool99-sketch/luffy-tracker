import { logMarketEvent } from "@/lib/market-data/core/logging";

export function appendAudit(event: string, payload: Record<string, unknown>) {
  logMarketEvent(event, payload);
}
