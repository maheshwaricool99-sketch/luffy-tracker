export function nowMs() {
  return Date.now();
}

export function ageMs(timestampMs: number | null | undefined, now = nowMs()) {
  if (!timestampMs || !Number.isFinite(timestampMs)) return null;
  return Math.max(0, now - timestampMs);
}

export function clamp(min: number, value: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
