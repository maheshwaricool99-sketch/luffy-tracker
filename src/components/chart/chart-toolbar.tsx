"use client";

import { Button } from "@/components/ui/button";

export type ChartVisibility = {
  ema20: boolean;
  ema50: boolean;
  ema200: boolean;
  vwap: boolean;
  zones: boolean;
  annotations: boolean;
  volume: boolean;
  tradePlanLines: boolean;
};

type Props = {
  visibility: ChartVisibility;
  onToggle: (key: keyof ChartVisibility) => void;
};

const KEYS: Array<{ key: keyof ChartVisibility; label: string }> = [
  { key: "ema20", label: "EMA20" },
  { key: "ema50", label: "EMA50" },
  { key: "ema200", label: "EMA200" },
  { key: "vwap", label: "VWAP" },
  { key: "zones", label: "Zones" },
  { key: "annotations", label: "Notes" },
  { key: "volume", label: "Volume" },
  { key: "tradePlanLines", label: "Trade" },
];

export function ChartToolbar({ visibility, onToggle }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {KEYS.map((item) => (
        <Button
          key={item.key}
          variant={visibility[item.key] ? "primary" : "secondary"}
          className="h-9"
          onClick={() => onToggle(item.key)}
          aria-label={`Toggle ${item.label}`}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
