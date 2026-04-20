export const dynamic = "force-dynamic";

import { SignalsPage as SignalsPageView } from "@/components/signals/SignalsPage";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { listSignals } from "@/lib/signals/queries/listSignals";
import { getSignalsPulse } from "@/lib/signals/queries/getSignalsPulse";
import type { AppRole, MarketType, SignalStatus } from "@/lib/signals/types/signalEnums";

export default async function SignalsPage({
  searchParams,
}: {
  searchParams: Promise<{
    market?: string;
    query?: string;
    direction?: string;
    confidenceMin?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  const params = await searchParams;
  const user = await getSessionUser();
  const role: AppRole = user?.appRole ?? "GUEST";

  const market = params.market ? (params.market.toUpperCase() as MarketType) : undefined;
  const query = params.query?.toUpperCase() ?? "";

  const initialPayload = await listSignals({
    market,
    query: query || undefined,
    status: params.status ? (params.status.toUpperCase() as SignalStatus) : undefined,
    confidenceMin: params.confidenceMin ? Number(params.confidenceMin) : undefined,
    sortBy: (params.sortBy as "publishedAt" | "confidenceScore" | "symbol" | undefined),
    sortOrder: (params.sortOrder as "asc" | "desc" | undefined),
    limit: 20,
  }, role, user?.id);

  const initialPulse = await getSignalsPulse(role);

  return (
    <SignalsPageView
      initialMarket={market}
      initialQuery={query || undefined}
      initialPayload={{
        ...initialPayload,
        meta: {
          role,
          delayed: role === "GUEST" || role === "FREE",
        },
      }}
      initialPulse={initialPulse}
      initialSelected={null}
    />
  );
}
