"use client";

import type { StepDropoff } from "@/server/analytics/queries";

import { AiExplainButton } from "./ai-explain-button";
import { DropoffChart } from "./dropoff-chart";
import { EmptyState, LowSampleNote } from "./empty-state";

export function DropoffTab({
  funnelId,
  dropoff,
  hasAnyData,
  hasEnoughData,
}: {
  funnelId: string;
  dropoff: StepDropoff[];
  hasAnyData: boolean;
  hasEnoughData: boolean;
}) {
  if (!hasAnyData) return <EmptyState />;

  const maiorQueda = [...dropoff].sort((a, b) => b.dropoffPct - a.dropoffPct)[0];

  return (
    <div className="flex flex-col gap-4">
      {!hasEnoughData && <LowSampleNote />}

      <div className="rounded-2xl border border-app-border bg-app-surface p-4">
        <h2 className="mb-3 text-sm font-medium text-app-text">Sessões por etapa</h2>
        <DropoffChart data={dropoff} />
      </div>

      {maiorQueda && maiorQueda.dropoffPct > 0 && (
        <p className="rounded-lg border border-app-border bg-app-surface-2 px-3 py-2 text-xs text-app-muted">
          Maior queda: <span className="text-app-text">{maiorQueda.stepName}</span> perde{" "}
          {Math.round(maiorQueda.dropoffPct * 100)}% de quem chegou até ali.
        </p>
      )}

      {hasEnoughData && (
        <AiExplainButton
          funnelId={funnelId}
          section="funil"
          sampleSize={dropoff[0]?.sessions ?? 0}
          metrics={{
            steps: dropoff.map((step) => ({
              name: step.stepName,
              sessions: step.sessions,
              dropoffPct: step.dropoffPct,
            })),
          }}
        />
      )}
    </div>
  );
}
