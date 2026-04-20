type DecisionLogEntry = {
  symbol: string;
  market: string;
  stage: string;
  reason: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
};

const decisionLog: DecisionLogEntry[] = [];

export function recordDecision(entry: DecisionLogEntry) {
  decisionLog.push(entry);
  if (decisionLog.length > 2_000) decisionLog.shift();
}

export function getDecisionLog() {
  return [...decisionLog];
}

export function clearDecisionLog() {
  decisionLog.length = 0;
}
