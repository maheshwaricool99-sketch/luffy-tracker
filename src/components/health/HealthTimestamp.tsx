"use client";

import { useEffect, useState } from "react";

function formatAge(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}

function formatAbsolute(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function HealthTimestamp({
  ts,
  label,
  className = "",
}: {
  ts: number | null | undefined;
  label?: string;
  className?: string;
}) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  if (!ts) {
    return (
      <span className={`text-[#70809A] ${className}`}>
        {label ? `${label}: ` : ""}Not available
      </span>
    );
  }

  const ageMs = now > 0 ? now - ts : 0;

  return (
    <span
      className={`cursor-default text-[#70809A] ${className}`}
      title={formatAbsolute(ts)}
    >
      {label ? <span className="mr-1">{label}:</span> : null}
      <span>{formatAge(ageMs)}</span>
    </span>
  );
}
