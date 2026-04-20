import { redirect } from "next/navigation";
import { parseTimeframe } from "@/lib/analysis/validation";

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ pair?: string; symbol?: string; timeframe?: string; tf?: string }>;
}) {
  const params = await searchParams;
  const symbol = (params.pair ?? params.symbol ?? "BTCUSDT").toUpperCase();
  const timeframeRaw = params.timeframe ?? params.tf ?? "1H";
  const timeframeResult = parseTimeframe(timeframeRaw);
  const timeframe = timeframeResult.success ? timeframeResult.data : "1H";
  redirect(`/analysis/${encodeURIComponent(symbol)}?timeframe=${encodeURIComponent(timeframe)}`);
}
