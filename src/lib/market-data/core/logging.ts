export function logMarketEvent(event: string, payload: Record<string, unknown>) {
  console.info(`[market-data:${event}]`, JSON.stringify({
    timestamp: Date.now(),
    event,
    ...payload,
  }));
}
