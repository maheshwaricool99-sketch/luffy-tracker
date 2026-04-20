"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import type { AnalysisChartData } from "@/lib/analysis/types";
import { AnalysisChart } from "@/components/chart/analysis-chart";
import { ChartLegend } from "@/components/chart/chart-legend";
import { ChartToolbar, type ChartVisibility } from "@/components/chart/chart-toolbar";
import { ChartAnnotationLayer } from "@/components/chart/chart-annotation-layer";

type Props = {
  chart: AnalysisChartData;
};

const INITIAL_VISIBILITY: ChartVisibility = {
  ema20: true,
  ema50: true,
  ema200: false,
  vwap: false,
  zones: true,
  annotations: true,
  volume: true,
  tradePlanLines: true,
};

export function SmartChartCard({ chart }: Props) {
  const [visibility, setVisibility] = useState(INITIAL_VISIBILITY);

  return (
    <Card title="Smart Chart" subtitle="Annotated candle structure with key zones and event overlays.">
      <div className="space-y-3">
        <ChartToolbar visibility={visibility} onToggle={(key) => setVisibility((prev) => ({ ...prev, [key]: !prev[key] }))} />
        <ChartLegend chart={chart} />
        <div className="relative">
          <AnalysisChart data={chart} />
          <ChartAnnotationLayer chart={chart} visible={visibility.annotations} />
        </div>
      </div>
    </Card>
  );
}
