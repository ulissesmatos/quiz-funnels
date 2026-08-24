"use client";

import { Card } from "@/components/ui/card";
import type { FunnelOverview, TrendPoint } from "@/server/analytics/queries";

import { AiExplainButton } from "./ai-explain-button";
import { EmptyState, LowSampleNote } from "./empty-state";
import { KpiCard } from "./kpi-card";
import { TrendChart } from "./trend-chart";

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function OverviewTab({
  funnelId,
  overview,
  trend,
  hasAnyData,
  hasEnoughData,
}: {
  funnelId: string;
  overview: FunnelOverview;
  trend: TrendPoint[];
  hasAnyData: boolean;
  hasEnoughData: boolean;
}) {
  if (!hasAnyData) return <EmptyState />;

  return (
    <div className="flex flex-col gap-4">
      {!hasEnoughData && <LowSampleNote />}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Visualizações" value={String(overview.totalViews)} />
        <KpiCard
          label="Engajamento"
          value={pct(overview.engagementRate)}
          hint={`${overview.engagedViews} de ${overview.totalViews}`}
        />
        <KpiCard
          label="Conclusão"
          value={pct(overview.completionRate)}
          hint={`${overview.completedSessions} conclusões`}
        />
        <KpiCard label="Cliques no CTA" value={String(overview.ctaClicks)} hint={pct(overview.ctaClickRate)} />
      </div>

      <Card padding="sm">
        <h2 className="mb-3 text-sm font-medium text-app-text">Visualizações e conclusões</h2>
        <TrendChart data={trend} />
      </Card>

      {hasEnoughData && (
        <AiExplainButton
          funnelId={funnelId}
          section="visao_geral"
          sampleSize={overview.totalViews}
          metrics={{
            totalViews: overview.totalViews,
            engagedViews: overview.engagedViews,
            engagementRate: overview.engagementRate,
            completedSessions: overview.completedSessions,
            completionRate: overview.completionRate,
            ctaClicks: overview.ctaClicks,
            ctaClickRate: overview.ctaClickRate,
          }}
        />
      )}
    </div>
  );
}
