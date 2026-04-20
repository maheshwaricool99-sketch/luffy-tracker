import type { ReactNode } from "react";

export type EngineMetric = {
  label: string;
  value: ReactNode;
  hint?: string;
};

export function EngineMetricRow({ metrics }: { metrics: EngineMetric[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {metrics.map((m) => (
        <div key={m.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#70839B]">{m.label}</div>
          <div className="mt-1.5 text-[15px] font-semibold text-[#F3F7FF]">{m.value}</div>
          {m.hint ? <div className="mt-1 text-[11px] text-[#70839B]">{m.hint}</div> : null}
        </div>
      ))}
    </div>
  );
}
