import type { MarketId } from "@/lib/market-data/shared/types";
import { isIndiaMarketOpen } from "@/lib/market-data/india/adapter";

function timeParts(timeZone: string, now = Date.now()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = formatter.formatToParts(new Date(now));
  const data = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const day = data.weekday;
  const hour = Number(data.hour ?? "0");
  const minute = Number(data.minute ?? "0");
  return { day, minutes: hour * 60 + minute };
}

export function isMarketSessionOpen(market: MarketId, now = Date.now()) {
  if (market === "crypto") return { open: true, session: "24/7" };
  if (market === "india") {
    return { open: isIndiaMarketOpen(now), session: "09:15-15:30 IST" };
  }
  const ny = timeParts("America/New_York", now);
  const weekdayClosed = ny.day === "Sat" || ny.day === "Sun";
  const open = !weekdayClosed && ny.minutes >= (9 * 60 + 30) && ny.minutes <= (16 * 60);
  return { open, session: "09:30-16:00 America/New_York" };
}
