export function formatPercent(value: number | null, digits = 0) {
  if (value === null) return "Unavailable";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

export function formatWinRate(value: number | null) {
  if (value === null) return "No closed trades yet";
  return `${Math.round(value)}%`;
}

export function formatR(value: number | null, digits = 2) {
  if (value === null) return "Unavailable";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}R`;
}

export function formatSignedNumber(value: number | null, digits = 2, suffix = "") {
  if (value === null) return "Unavailable";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}${suffix}`;
}

export function formatCount(value: number | null) {
  if (value === null) return "Unavailable";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPrice(value: number) {
  if (!Number.isFinite(value)) return "--";
  if (Math.abs(value) >= 1000) return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  if (Math.abs(value) >= 100) return value.toFixed(2);
  if (Math.abs(value) >= 1) return value.toFixed(3);
  return value.toFixed(4);
}

export function formatTimestamp(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}
