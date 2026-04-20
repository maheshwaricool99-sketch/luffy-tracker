export function TrustTimestamp({ timestamp }: { timestamp: string | null }) {
  return (
    <span className="text-[12px] text-[#70809A]">
      {timestamp ? new Date(timestamp).toLocaleString() : "Unavailable"}
    </span>
  );
}
