export function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

export function hashSeed(value: string) {
  return value.split("").reduce((acc, char) => ((acc * 33) + char.charCodeAt(0)) >>> 0, 17);
}

export function pctChange(from: number, to: number) {
  if (!Number.isFinite(from) || from === 0 || !Number.isFinite(to)) return 0;
  return ((to - from) / from) * 100;
}

export function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function stdDev(values: number[]) {
  if (values.length < 2) return 0;
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

export function ema(values: number[], period: number) {
  if (values.length === 0) return 0;
  const alpha = 2 / (period + 1);
  let acc = values[0];
  for (let i = 1; i < values.length; i += 1) {
    acc = values[i] * alpha + acc * (1 - alpha);
  }
  return acc;
}

export function formatTimestamp(value: number) {
  const date = new Date(value);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  const second = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}
