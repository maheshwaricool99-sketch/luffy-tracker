import { Card } from "@/components/ui/card";
import type { OrderBookSnapshot } from "@/lib/analysis/types";
import { formatPrice } from "@/lib/analysis/formatters";

type Props = { orderBook: OrderBookSnapshot | null; entitlement: boolean };

export function OrderBookCard({ orderBook, entitlement }: Props) {
  return (
    <Card title="Order Book" subtitle="Top-of-book depth and spread conditions.">
      {!entitlement || !orderBook ? <p className="text-sm text-[var(--text-soft)]">Order-book depth is premium-only.</p> : (
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <p className="mb-1 text-xs text-[var(--text-muted)]">Bids</p>
            <div className="space-y-1">
              {orderBook.bids.slice(0, 8).map((row) => (
                <div key={`b-${row.price}`} className="flex items-center justify-between rounded-md border border-[var(--line)] px-2 py-1 text-xs">
                  <span>{formatPrice(row.price)}</span><span>{row.size.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-[var(--text-muted)]">Asks</p>
            <div className="space-y-1">
              {orderBook.asks.slice(0, 8).map((row) => (
                <div key={`a-${row.price}`} className="flex items-center justify-between rounded-md border border-[var(--line)] px-2 py-1 text-xs">
                  <span>{formatPrice(row.price)}</span><span>{row.size.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
