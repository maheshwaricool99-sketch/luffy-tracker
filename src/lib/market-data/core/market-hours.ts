/**
 * Returns true if the given market is currently within its regular trading session.
 * Crypto is 24/7. US and India equities have weekday-only windows.
 *
 * Used to distinguish "market closed — stale data expected" from actual provider failures.
 */
export function isWithinTradingHours(market: string): boolean {
  if (market === "crypto") return true;
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  if (market === "us") {
    // NYSE 9:30 AM–4:00 PM ET → 13:30–21:00 UTC (covers both EST and EDT)
    return utcMinutes >= 13 * 60 + 30 && utcMinutes < 21 * 60;
  }
  if (market === "india") {
    // NSE 9:15 AM–3:30 PM IST (UTC+5:30) → 3:45–10:00 UTC
    return utcMinutes >= 3 * 60 + 45 && utcMinutes < 10 * 60;
  }
  return true;
}
