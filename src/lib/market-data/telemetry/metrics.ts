const counters = globalThis.__marketMetrics ?? new Map<string, number>();

declare global {
  var __marketMetrics: Map<string, number> | undefined;
}

if (!globalThis.__marketMetrics) globalThis.__marketMetrics = counters;

export function incrementMetric(name: string, amount = 1) {
  counters.set(name, (counters.get(name) ?? 0) + amount);
}

export function setMetric(name: string, value: number) {
  counters.set(name, value);
}

export function getMetricsSnapshot() {
  return Object.fromEntries(counters.entries());
}
