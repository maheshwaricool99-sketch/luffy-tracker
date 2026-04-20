import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AnalysisEntitlements } from "@/lib/analysis/types";

type Props = { entitlements: AnalysisEntitlements };

export function PremiumUnlockBanner({ entitlements }: Props) {
  if (entitlements.canViewAdvancedReasoning && entitlements.canViewOrderBook) return null;

  return (
    <Card title="Unlock Premium Analysis" subtitle="Get full trade-plan precision, deep flow diagnostics, and real-time event intelligence.">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ul className="space-y-1 text-sm text-[var(--text-soft)]">
          <li>Full TP ladder, trailing stop, and scenario modeling</li>
          <li>Order-flow, order-book, smart-money, and deep event feed</li>
          <li>Live updates and advanced AI reasoning factors</li>
        </ul>
        <Link href="/pricing">
          <Button variant="primary" className="h-10 w-full sm:w-auto">Go Premium</Button>
        </Link>
      </div>
    </Card>
  );
}
