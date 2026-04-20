export function isoNow() {
  return new Date().toISOString();
}

export function secondsSince(timestamp: string | null | undefined) {
  if (!timestamp) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
}
