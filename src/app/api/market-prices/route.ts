import { getUnifiedPrices } from "@/lib/paper-exchange";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawSymbols = (url.searchParams.get("symbols") ?? "").split(",");
  const symbols = [...new Set(rawSymbols.map((item) => item.trim().toUpperCase()).filter(Boolean))].slice(0, 80);
  if (symbols.length === 0) {
    return NextResponse.json({ prices: {}, updatedAt: Date.now() }, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const prices = await getUnifiedPrices(symbols);
  const payload = Object.fromEntries(symbols.map((symbol) => [symbol, prices.get(symbol)?.price ?? 0]));
  const meta = Object.fromEntries(symbols.map((symbol) => {
    const entry = prices.get(symbol);
    return [symbol, entry ? { source: entry.source, lastUpdateTs: entry.timestamp, ageMs: entry.ageMs } : null];
  }));
  return NextResponse.json({ prices: payload, meta, updatedAt: Date.now() }, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
