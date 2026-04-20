import type { EngineStatusResponse } from "@/server/engines/engine-types";
import { EngineStatusBadge } from "./EngineStatusBadge";

function OverviewCard({
  title,
  statusLabel,
  statusBadge,
  subtitle,
}: {
  title: string;
  statusLabel: string;
  statusBadge: string;
  subtitle: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#0B1728] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#70839B]">{title}</div>
      <div className="mt-2 flex items-center gap-2">
        <EngineStatusBadge status={statusBadge} />
        <span className="text-[15px] font-semibold text-[#F3F7FF]">{statusLabel}</span>
      </div>
      <p className="mt-2 text-[12px] leading-5 text-[#9FB1C7]">{subtitle}</p>
    </article>
  );
}

export function EngineControlOverview({ data }: { data: EngineStatusResponse }) {
  const { priceEngine, executionEngine, overall } = data;
  const priceSubtitle =
    priceEngine.status === "live" ? "All market data providers healthy"
    : priceEngine.status === "down" ? "No healthy market data providers"
    : priceEngine.reason ?? "See details below";
  const execSubtitle =
    executionEngine.status === "inactive_by_design" ? "Signal-only deployment — intentional"
    : executionEngine.reason ?? "See details below";

  return (
    <section className="grid gap-3 md:grid-cols-3">
      <OverviewCard
        title="Price Infrastructure"
        statusLabel={priceEngine.status === "live" ? "Operational" : priceEngine.status.replace(/_/g, " ")}
        statusBadge={priceEngine.status}
        subtitle={priceSubtitle}
      />
      <OverviewCard
        title="Trading Execution"
        statusLabel={executionEngine.status.replace(/_/g, " ")}
        statusBadge={executionEngine.status}
        subtitle={execSubtitle}
      />
      <OverviewCard
        title="Overall Control Plane"
        statusLabel={overall.status.replace(/_/g, " ")}
        statusBadge={overall.status}
        subtitle={overall.reason}
      />
    </section>
  );
}
