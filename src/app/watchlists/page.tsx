export const dynamic = "force-dynamic";

import { getViewer } from "@/lib/auth";
import { getUserWatchlists } from "@/lib/user-product";
import { resolveEntitlements } from "@/lib/entitlements";
import { LockedFeature } from "@/components/ui/locked-feature";
import { SectionHeader } from "@/components/primitives/SectionHeader";
import { Panel } from "@/components/primitives/Panel";

export default async function WatchlistsPage() {
  const viewer = await getViewer();
  const entitlements = resolveEntitlements(viewer);
  const watchlists = viewer ? getUserWatchlists(viewer) : [];

  return (
    <div className="space-y-5">
      <SectionHeader title="Watchlists" subtitle="User-specific watchlists stored per account with entitlement-aware limits." />
      {!entitlements.canUseAdvancedWatchlists ? <LockedFeature title="Free accounts can keep up to three basic watchlists." detail="Premium expands watchlist capacity and symbol counts." /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {watchlists.map((watchlist) => (
          <Panel key={watchlist.id} title={watchlist.name}>
            <div className="space-y-2 text-[13px] text-[#A7B4C8]">
              {watchlist.symbols.length > 0 ? watchlist.symbols.map((symbol) => <div key={symbol}>{symbol}</div>) : <div>No symbols.</div>}
            </div>
          </Panel>
        ))}
        {watchlists.length === 0 ? <Panel title="No Watchlists"><div className="text-[13px] text-[#70809A]">Create a watchlist through the API to start persisting user-specific symbols.</div></Panel> : null}
      </div>
    </div>
  );
}
