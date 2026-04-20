export function EngineReasonBlock({
  reasonCode,
  reason,
  impact,
  tone = "neutral",
}: {
  reasonCode: string | null;
  reason: string | null;
  impact: string[];
  tone?: "neutral" | "info" | "warn" | "error";
}) {
  const border =
    tone === "error" ? "border-rose-400/25 bg-rose-400/5" :
    tone === "warn" ? "border-amber-400/25 bg-amber-400/5" :
    tone === "info" ? "border-sky-400/20 bg-sky-400/5" :
    "border-white/10 bg-white/[0.02]";
  return (
    <div className={`rounded-2xl border px-4 py-4 ${border}`}>
      {reasonCode ? (
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9FB1C7]">Reason · {reasonCode}</div>
      ) : null}
      {reason ? <p className="mt-2 text-[14px] leading-6 text-[#D3DCEA]">{reason}</p> : null}
      {impact.length > 0 ? (
        <ul className="mt-3 space-y-1 text-[13px] text-[#A3B5CB]">
          {impact.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-[#5B8CFF]">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
