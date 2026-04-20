type IntegrityLogEntry = {
  market: string;
  symbol?: string;
  issue: string;
  severity: "info" | "warn" | "error";
  metadata?: Record<string, unknown>;
  timestamp: number;
};

const integrityLog: IntegrityLogEntry[] = [];

export function recordIntegrityIssue(entry: IntegrityLogEntry) {
  integrityLog.push(entry);
  if (integrityLog.length > 2_000) integrityLog.shift();
}

export function getIntegrityLog() {
  return [...integrityLog];
}

export function clearIntegrityLog() {
  integrityLog.length = 0;
}
