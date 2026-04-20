import type { ComponentHealth } from "@/lib/health/health-types";
import { HealthStatusPill } from "./HealthStatusPill";
import { HealthTimestamp } from "./HealthTimestamp";

const STATUS_ORDER: Record<string, number> = {
  down: 0, reconnecting: 1, degraded: 2, paused: 3, disabled: 4, healthy: 5,
};

function ComponentRow({ component }: { component: ComponentHealth }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.04] py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-[#F3F7FF]">{component.label}</span>
          <HealthStatusPill status={component.status} size="xs" />
        </div>
        {component.note && (
          <p className="mt-0.5 text-[11px] text-[#70809A]">{component.note}</p>
        )}
      </div>
      <div className="flex flex-shrink-0 flex-wrap items-center gap-3 text-[11px] text-[#70809A]">
        {component.latencyMs !== null && (
          <span>{component.latencyMs}ms</span>
        )}
        {component.errorRatePct !== null && (
          <span className={component.errorRatePct > 10 ? "text-rose-400" : "text-[#70809A]"}>
            {component.errorRatePct}% err
          </span>
        )}
        <HealthTimestamp ts={component.lastHeartbeatMs} label="heartbeat" className="text-[11px]" />
      </div>
    </div>
  );
}

export function ComponentHealthGrid({ components }: { components: ComponentHealth[] }) {
  const sorted = [...components].sort((a, b) =>
    (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3),
  );

  const healthyCount = components.filter((c) => c.status === "healthy").length;
  const issueCount = components.filter((c) => !["healthy", "disabled", "paused"].includes(c.status)).length;
  const pausedCount = components.filter((c) => c.status === "paused").length;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0B1728] p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-semibold text-[#F3F7FF]">System Components</h2>
          <p className="mt-0.5 text-[12px] text-[#70809A]">
            {healthyCount} healthy
            {pausedCount > 0 ? ` · ${pausedCount} paused by admin` : ""}
            {issueCount > 0 ? ` · ${issueCount} with issues` : ""}
          </p>
        </div>
      </div>

      <div>
        {sorted.map((c) => (
          <ComponentRow key={c.key} component={c} />
        ))}
      </div>
    </div>
  );
}
