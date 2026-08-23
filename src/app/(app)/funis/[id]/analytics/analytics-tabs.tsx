"use client";

import { useState } from "react";

import type { FunnelPixels } from "@/funnel/schema";
import { cn } from "@/lib/cn";
import type {
  FunnelOverview,
  QuestionBreakdown,
  StepDropoff,
  TrafficSourceBreakdown,
  TrendPoint,
} from "@/server/analytics/queries";
import type { FunnelDomainListItem } from "@/server/domains/queries";

import { AnswersTab } from "./answers-tab";
import { DomainSettingsTab } from "./domain-settings-tab";
import { DropoffTab } from "./dropoff-tab";
import { OverviewTab } from "./overview-tab";
import { TrackingSettingsTab } from "./tracking-settings-tab";
import { TrafficTab } from "./traffic-tab";

type Aba = "visao_geral" | "funil" | "respostas" | "origem" | "rastreamento" | "dominio";

const ABAS: { chave: Aba; rotulo: string }[] = [
  { chave: "visao_geral", rotulo: "Visão geral" },
  { chave: "funil", rotulo: "Funil de etapas" },
  { chave: "respostas", rotulo: "Respostas" },
  { chave: "origem", rotulo: "Origem do tráfego" },
  { chave: "rastreamento", rotulo: "Rastreamento" },
  { chave: "dominio", rotulo: "Domínio" },
];

export function AnalyticsTabs({
  funnelId,
  overview,
  trend,
  dropoff,
  answers,
  traffic,
  pixels,
  domains,
  appHostname,
  hasAnyData,
  hasEnoughData,
}: {
  funnelId: string;
  overview: FunnelOverview;
  trend: TrendPoint[];
  dropoff: StepDropoff[];
  answers: QuestionBreakdown[];
  traffic: TrafficSourceBreakdown[];
  pixels: FunnelPixels;
  domains: FunnelDomainListItem[];
  appHostname: string;
  hasAnyData: boolean;
  hasEnoughData: boolean;
}) {
  const [aba, setAba] = useState<Aba>("visao_geral");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1 rounded-lg border border-app-border p-1">
        {ABAS.map(({ chave, rotulo }) => (
          <button
            key={chave}
            type="button"
            onClick={() => setAba(chave)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              aba === chave ? "bg-app-surface-2 text-app-text" : "text-app-muted hover:text-app-text",
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === "visao_geral" && (
        <OverviewTab
          funnelId={funnelId}
          overview={overview}
          trend={trend}
          hasAnyData={hasAnyData}
          hasEnoughData={hasEnoughData}
        />
      )}
      {aba === "funil" && (
        <DropoffTab funnelId={funnelId} dropoff={dropoff} hasAnyData={hasAnyData} hasEnoughData={hasEnoughData} />
      )}
      {aba === "respostas" && (
        <AnswersTab funnelId={funnelId} answers={answers} hasAnyData={hasAnyData} hasEnoughData={hasEnoughData} />
      )}
      {aba === "origem" && (
        <TrafficTab funnelId={funnelId} traffic={traffic} hasAnyData={hasAnyData} hasEnoughData={hasEnoughData} />
      )}
      {aba === "rastreamento" && <TrackingSettingsTab funnelId={funnelId} pixels={pixels} />}
      {aba === "dominio" && <DomainSettingsTab funnelId={funnelId} domains={domains} appHostname={appHostname} />}
    </div>
  );
}
