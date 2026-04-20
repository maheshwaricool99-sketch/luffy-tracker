import { NextRequest } from "next/server";
import { detectMarket } from "@/lib/analysis/market-router";
import { parseSymbol } from "@/lib/analysis/validation";
import { getSnapshot } from "@/lib/market-data/shared/price-service";

export const dynamic = "force-dynamic";

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ symbol: string }> }) {
  const { symbol: rawSymbol } = await context.params;
  const symbolResult = parseSymbol(rawSymbol);
  if (!symbolResult.success) {
    return new Response("Invalid symbol", { status: 400 });
  }
  const symbol = symbolResult.data;
  const market = detectMarket(symbol);
  if (!market) {
    return new Response("Unsupported market", { status: 404 });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const write = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(sse(event, data)));
      };

      write("heartbeat", { timestamp: Date.now() });

      const interval = setInterval(async () => {
        try {
          const snapshot = await getSnapshot(symbol, market.toLowerCase() as "crypto" | "us" | "india");
          write("price", {
            symbol,
            price: snapshot.price,
            timestamp: snapshot.tsReceived,
            freshness: snapshot.freshness,
          });
          write("status", {
            symbol,
            status: snapshot.freshness === "GOOD" ? "ACTIVE" : "WATCHING",
            distanceToEntryPct: null,
            timestamp: Date.now(),
          });
          write("heartbeat", { timestamp: Date.now() });
        } catch {
          write("status", {
            symbol,
            status: "WATCHING",
            stale: true,
            reason: "stream_source_unavailable",
            timestamp: Date.now(),
          });
        }
      }, 15_000);

      const shutdown = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        controller.close();
      };

      // Auto-close stream after 5 minutes so clients reconnect cleanly.
      setTimeout(shutdown, 5 * 60_000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
