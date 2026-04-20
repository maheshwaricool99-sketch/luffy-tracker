export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { getAnalysisEntitlements } from "@/lib/analysis/access";
import { detectMarket } from "@/lib/analysis/market-router";
import { buildMockAnalysis } from "@/lib/analysis/mock";
import { serializeAnalysisForEntitlements } from "@/lib/analysis/serializer";
import { parseSymbol, parseTimeframe } from "@/lib/analysis/validation";
import { AiAnalysisHeader } from "@/components/analysis/ai-analysis-header";
import { FreshnessBar } from "@/components/analysis/freshness-bar";
import { DecisionEngineCard } from "@/components/analysis/decision-engine-card";
import { MtfConfluenceCard } from "@/components/analysis/mtf-confluence-card";
import { SmartChartCard } from "@/components/analysis/smart-chart-card";
import { EventAlertsCard } from "@/components/analysis/event-alerts-card";
import { TradePlanCard } from "@/components/analysis/trade-plan-card";
import { PositionSizerCard } from "@/components/analysis/position-sizer-card";
import { ScenarioCard } from "@/components/analysis/scenario-card";
import { IndicatorIntelligenceCard } from "@/components/analysis/indicator-intelligence-card";
import { PatternRecognitionCard } from "@/components/analysis/pattern-recognition-card";
import { AiExplanationCard } from "@/components/analysis/ai-explanation-card";
import { MarketContextCard } from "@/components/analysis/market-context-card";
import { OnChainCard } from "@/components/analysis/on-chain-card";
import { OrderFlowCard } from "@/components/analysis/order-flow-card";
import { SmartMoneyCard } from "@/components/analysis/smart-money-card";
import { OrderBookCard } from "@/components/analysis/order-book-card";
import { NewsCatalystCard } from "@/components/analysis/news-catalyst-card";
import { CorrelationCard } from "@/components/analysis/correlation-card";
import { RiskAnalysisCard } from "@/components/analysis/risk-analysis-card";
import { HistoricalEdgeCard } from "@/components/analysis/historical-edge-card";
import { LiveStatusCard } from "@/components/analysis/live-status-card";
import { PremiumUnlockBanner } from "@/components/analysis/premium-unlock-banner";

export default async function AnalysisSymbolPage({
  params,
  searchParams,
}: {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ timeframe?: string }>;
}) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const symbolResult = parseSymbol(resolvedParams.symbol);
  if (!symbolResult.success) notFound();

  const symbol = symbolResult.data;
  const timeframeResult = parseTimeframe(resolvedSearchParams.timeframe ?? "1H");
  const timeframe = timeframeResult.success ? timeframeResult.data : "1H";
  const market = detectMarket(symbol);
  if (!market) notFound();

  const viewer = await getSessionUser();
  const entitlements = getAnalysisEntitlements(viewer);
  const payload = await buildMockAnalysis(symbol, market, timeframe, entitlements);
  const analysis = serializeAnalysisForEntitlements(payload, entitlements);

  return (
    <main className="min-h-screen w-full overflow-x-hidden py-4 sm:py-6 lg:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <AiAnalysisHeader
          symbol={analysis.symbol}
          market={analysis.market}
          assetName={analysis.assetName}
          timeframe={analysis.timeframe}
          exchange={analysis.exchange}
          updatedAt={analysis.generatedAt}
          liveStatus={analysis.liveStatus}
          entitlements={analysis.entitlements}
        />

        <FreshnessBar freshness={analysis.freshness} />
        <DecisionEngineCard decision={analysis.decisionEngine} />
        <MtfConfluenceCard mtf={analysis.mtfConfluence} entitlement={analysis.entitlements.canViewMtfConfluence} />

        <section className="grid gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <SmartChartCard chart={analysis.chart} />
            <TradePlanCard
              tradePlan={analysis.tradePlan}
              currentPrice={analysis.liveStatus.currentPrice}
              entitlement={analysis.entitlements.canViewFullTradePlan}
            />
          </div>
          <div className="space-y-4">
            <EventAlertsCard events={analysis.events} entitlement={analysis.entitlements.canViewDeepEvents} />
            <LiveStatusCard
              symbol={analysis.symbol}
              status={analysis.liveStatus}
              tradePlan={analysis.tradePlan}
              entitlement={analysis.entitlements.canViewRealtime}
            />
            <PositionSizerCard tradePlan={analysis.tradePlan} entitlement={analysis.entitlements.canViewFullTradePlan} />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <IndicatorIntelligenceCard indicators={analysis.indicators} />
          <PatternRecognitionCard patterns={analysis.patterns} />
          <AiExplanationCard explanation={analysis.explanation} entitlement={analysis.entitlements.canViewAdvancedReasoning} />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MarketContextCard context={analysis.marketContext} market={analysis.market} />
          <OnChainCard data={analysis.onChain} market={analysis.market} entitlement={analysis.entitlements.canViewOnChain} />
          <OrderFlowCard data={analysis.orderFlow} entitlement={analysis.entitlements.canViewOrderFlow} />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SmartMoneyCard data={analysis.smartMoney} entitlement={analysis.entitlements.canViewSmartMoney} />
          <OrderBookCard orderBook={analysis.orderBook} entitlement={analysis.entitlements.canViewOrderBook} />
          <NewsCatalystCard data={analysis.newsAndCatalysts} />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CorrelationCard data={analysis.correlation} market={analysis.market} />
          <RiskAnalysisCard risk={analysis.riskAnalysis} />
          <HistoricalEdgeCard edge={analysis.historicalEdge} entitlement={analysis.entitlements.canViewHistoricalEdge} />
        </section>

        <ScenarioCard scenarios={analysis.scenarios} />
        <PremiumUnlockBanner entitlements={analysis.entitlements} />
      </div>
    </main>
  );
}
