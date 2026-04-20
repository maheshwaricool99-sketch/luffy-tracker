import type { IntelligenceFeedMeta } from "@/lib/intelligence/types";
import { IntegrityBadge } from "./SignalBadges";

const SOURCE_LABELS: Record<string, string> = {
  LIVE_PROVIDER: "Live Provider",
  DELAYED_FEED: "Delayed Feed",
  SNAPSHOT: "Snapshot",
  CACHED: "Cached",
};

function MetaRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-[#70809A]">{label}</span>
      <span className={`text-[11px] font-medium ${warn ? "text-amber-400" : "text-[#A7B4C8]"}`}>{value}</span>
    </div>
  );
}

function SyncDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-rose-400"}`} />
  );
}

function formatAge(ms: number) {
  const sec = Math.round(ms / 1000);
  if (sec < 10) return "Live";
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  return `${Math.round(sec / 3600)}h ago`;
}

function IntegrityWarning({ status }: { status: string }) {
  if (["VERIFIED", "LIVE", "DELAYED"].includes(status)) return null;
  const messages: Record<string, string> = {
    PARTIAL: "Feed partially unavailable — data may be incomplete.",
    DEGRADED: "Degraded feed — not suitable for precision intraday entry.",
    MISMATCHED: "Price/volume mismatch detected — treat as informational only.",
    UNTRUSTED: "Feed untrusted — view idea only. Wait for feed recovery.",
    SCANNER_ONLY: "Scanner-only signal. External feed not confirmed.",
    REVIEW_REQUIRED: "Signal requires admin review before acting.",
  };
  return (
    <div className="mt-2 rounded-lg border border-amber-400/25 bg-amber-400/8 px-3 py-2 text-[11px] text-amber-300">
      ⚠ {messages[status] ?? "Feed quality reduced."}
    </div>
  );
}

export function SignalTrustMeta({ meta }: { meta: IntelligenceFeedMeta }) {
  return (
    <div className="px-4 py-3 border-b border-white/[0.05]">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#70809A]">Data Trust</span>
        <IntegrityBadge status={meta.integrityStatus} />
      </div>
      <div className="space-y-1">
        <MetaRow label="Source" value={meta.dataSource} />
        <MetaRow label="Feed Type" value={SOURCE_LABELS[meta.feedType] ?? meta.feedType} />
        <MetaRow
          label="Freshness"
          value={formatAge(meta.freshnessMs)}
          warn={meta.freshnessMs > 300_000}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-[#70809A]">Price Sync</span>
          <div className="flex items-center gap-1.5">
            <SyncDot ok={meta.priceAligned} />
            <span className="text-[11px] text-[#A7B4C8]">{meta.priceAligned ? "OK" : "Misaligned"}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-[#70809A]">Volume Sync</span>
          <div className="flex items-center gap-1.5">
            <SyncDot ok={meta.volumeAligned} />
            <span className="text-[11px] text-[#A7B4C8]">{meta.volumeAligned ? "OK" : "Not confirmed"}</span>
          </div>
        </div>
        {meta.adminReviewed && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-[#70809A]">Review</span>
            <span className="text-[11px] font-medium text-violet-300">Admin reviewed</span>
          </div>
        )}
      </div>
      <IntegrityWarning status={meta.integrityStatus} />
    </div>
  );
}
