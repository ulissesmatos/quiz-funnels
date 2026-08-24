"use client";

import { Card } from "@/components/ui/card";
import type { TrafficSourceBreakdown } from "@/server/analytics/queries";
import { TRAFFIC_SOURCE_LABELS } from "@/server/analytics/traffic-source";

import { AiExplainButton } from "./ai-explain-button";
import { EmptyState, LowSampleNote } from "./empty-state";
import { TrafficSourceBars } from "./traffic-source-bars";

export function TrafficTab({
  funnelId,
  traffic,
  hasAnyData,
  hasEnoughData,
}: {
  funnelId: string;
  traffic: TrafficSourceBreakdown[];
  hasAnyData: boolean;
  hasEnoughData: boolean;
}) {
  if (!hasAnyData) return <EmptyState />;

  const total = traffic.reduce((sum, entry) => sum + entry.sessions, 0);

  return (
    <div className="flex flex-col gap-4">
      {!hasEnoughData && <LowSampleNote />}

      <Card padding="sm">
        <h2 className="mb-3 text-sm font-medium text-app-text">De onde vieram os visitantes</h2>
        <TrafficSourceBars data={traffic} />
      </Card>

      {hasEnoughData && (
        <AiExplainButton
          funnelId={funnelId}
          section="origem"
          sampleSize={total}
          metrics={{
            sources: traffic.map((entry) => ({
              source: TRAFFIC_SOURCE_LABELS[entry.source],
              sessions: entry.sessions,
              pct: entry.pct,
            })),
          }}
        />
      )}
    </div>
  );
}
