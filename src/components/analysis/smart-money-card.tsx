import { Card } from "@/components/ui/card";
import type { SmartMoneyFootprint } from "@/lib/analysis/types";
import { formatCompactUsd } from "@/lib/analysis/formatters";

type Props = { data: SmartMoneyFootprint | null; entitlement: boolean };

export function SmartMoneyCard({ data, entitlement }: Props) {
  return (
    <Card title="Smart Money" subtitle="Flow footprint and absorption/spoofing diagnostics.">
      {!entitlement || !data ? <p className="text-sm text-[var(--text-soft)]">Smart-money footprint requires Premium.</p> : (
        <div className="space-y-2 text-sm text-[var(--text-soft)]">
          <p>CVD divergence: <span className="font-medium text-[var(--text-strong)]">{data.cvdDivergence ? "Yes" : "No"}</span></p>
          <p>Absorption at support: <span className="font-medium text-[var(--text-strong)]">{data.absorptionAtSupport ? "Yes" : "No"}</span></p>
          <p>Delta imbalance: <span className="font-medium text-[var(--text-strong)]">{formatCompactUsd(data.deltaImbalanceUsd)}</span></p>
          <p>Spoofing pressure: <span className="font-medium text-[var(--text-strong)]">{data.spoofingPressure}</span></p>
        </div>
      )}
    </Card>
  );
}
