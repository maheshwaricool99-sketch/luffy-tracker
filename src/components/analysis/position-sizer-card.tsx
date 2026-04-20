"use client";

import { useMemo, useReducer } from "react";
import { Card } from "@/components/ui/card";
import type { TradePlan } from "@/lib/analysis/types";
import { formatCompactUsd } from "@/lib/analysis/formatters";

type Props = { tradePlan: TradePlan; entitlement: boolean };

type State = { accountSize: number; riskPct: number };

type Action = { type: "account" | "risk"; value: number };

function reducer(state: State, action: Action): State {
  if (action.type === "account") return { ...state, accountSize: Number.isFinite(action.value) ? action.value : state.accountSize };
  return { ...state, riskPct: Number.isFinite(action.value) ? action.value : state.riskPct };
}

export function PositionSizerCard({ tradePlan, entitlement }: Props) {
  const [state, dispatch] = useReducer(reducer, { accountSize: 10_000, riskPct: 1 });

  const computed = useMemo(() => {
    if (!entitlement || !tradePlan.entryPrice || !tradePlan.stopLoss) return null;
    const perUnitRisk = Math.abs(tradePlan.entryPrice - tradePlan.stopLoss);
    if (perUnitRisk <= 0) return null;
    const riskUsd = state.accountSize * (state.riskPct / 100);
    const units = riskUsd / perUnitRisk;
    return {
      riskUsd,
      units,
      positionValue: units * tradePlan.entryPrice,
    };
  }, [entitlement, tradePlan.entryPrice, tradePlan.stopLoss, state.accountSize, state.riskPct]);

  return (
    <Card title="Position Sizer" subtitle="Risk-based size estimator tied to entry and stop distance.">
      {!entitlement ? <p className="text-sm text-[var(--text-soft)]">Available on Premium plans.</p> : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="space-y-1">
              <span className="text-xs text-[var(--text-muted)]">Account Size</span>
              <input className="h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] px-3" type="number" value={state.accountSize} onChange={(e) => dispatch({ type: "account", value: Number(e.target.value) })} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-[var(--text-muted)]">Risk %</span>
              <input className="h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] px-3" type="number" value={state.riskPct} step={0.1} onChange={(e) => dispatch({ type: "risk", value: Number(e.target.value) })} />
            </label>
          </div>
          {computed ? (
            <div className="space-y-1 text-sm text-[var(--text-soft)]">
              <p>Risk per trade: <span className="font-semibold text-[var(--text-strong)]">{formatCompactUsd(computed.riskUsd)}</span></p>
              <p>Estimated units: <span className="font-semibold text-[var(--text-strong)]">{computed.units.toFixed(4)}</span></p>
              <p>Estimated position value: <span className="font-semibold text-[var(--text-strong)]">{formatCompactUsd(computed.positionValue)}</span></p>
            </div>
          ) : <p className="text-sm text-[var(--text-soft)]">Insufficient trade-plan data for sizing.</p>}
        </div>
      )}
    </Card>
  );
}
