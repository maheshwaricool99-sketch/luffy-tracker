"use client";

import { useEffect, useState } from "react";
import type { HealthResponse } from "@/lib/health/health-types";
import { HealthHeader } from "./HealthHeader";
import { GlobalStatusCard } from "./GlobalStatusCard";
import { HealthBannerCard } from "./HealthBannerCard";
import { MarketHealthCardComponent } from "./MarketHealthCard";
import { SignalReliabilityCard } from "./SignalReliabilityCard";
import { ComponentHealthGrid } from "./ComponentHealthGrid";
import { TradeBlockersCard } from "./TradeBlockersCard";
import { IncidentTimeline } from "./IncidentTimeline";

const POLL_INTERVAL_MS = 30_000;

export function HealthPageClient({ initial }: { initial: HealthResponse }) {
  const [data, setData] = useState<HealthResponse>(initial);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();

    async function tick() {
      try {
        const res = await fetch("/api/health", { cache: "no-store", signal: ctrl.signal });
        if (!res.ok) return;
        const next = (await res.json()) as HealthResponse;
        if (!cancelled) setData(next);
      } catch {
        // swallow — we'll retry next tick
      }
    }

    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      ctrl.abort();
      clearInterval(id);
    };
  }, []);

  const bootstrapping = data.summary.bootstrapping;
  const recovering = data.summary.recovering;
  const posture = data.trust?.posture ?? "CAUTION";

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <HealthHeader
        timestamps={data.timestamps}
        posture={posture}
        bootstrapping={bootstrapping}
        recovering={recovering}
      />
      <GlobalStatusCard data={data} bootstrapping={bootstrapping} recovering={recovering} />
      {data.banner && <HealthBannerCard banner={data.banner} />}

      <section>
        <SectionTitle>Market Health</SectionTitle>
        <div className="grid gap-6 xl:grid-cols-3">
          <MarketHealthCardComponent card={data.markets.crypto} />
          <MarketHealthCardComponent card={data.markets.us} />
          <MarketHealthCardComponent card={data.markets.india} />
        </div>
      </section>

      <SignalReliabilityCard reliability={data.reliability} />
      <ComponentHealthGrid components={data.components} />

      <div className="grid gap-6 xl:grid-cols-2">
        <TradeBlockersCard blockers={data.blockers} />
        <IncidentTimeline incidents={data.incidents} />
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#70809A]">
      {children}
    </h2>
  );
}
