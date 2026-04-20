export const dynamic = "force-dynamic";

import { getHealthSnapshot } from "@/lib/health/health-aggregator";
import { HealthPageClient } from "@/components/health/HealthPageClient";

export default async function HealthPage() {
  let data;
  try {
    data = await getHealthSnapshot();
  } catch {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-8 text-center">
        <div>
          <p className="text-[15px] font-semibold text-rose-400">Health Telemetry Unavailable</p>
          <p className="mt-1 text-[13px] text-[#A7B4C8]">
            The health aggregation service failed to start. The platform may still be operational — refresh to try again.
          </p>
        </div>
      </div>
    );
  }

  return <HealthPageClient initial={data} />;
}
