"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FunnelPixels } from "@/funnel/schema";
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
  return (
    <Tabs defaultValue="visao_geral" className="flex flex-col gap-4">
      <TabsList>
        {ABAS.map(({ chave, rotulo }) => (
          <TabsTrigger key={chave} value={chave}>
            {rotulo}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="visao_geral">
        <OverviewTab
          funnelId={funnelId}
          overview={overview}
          trend={trend}
          hasAnyData={hasAnyData}
          hasEnoughData={hasEnoughData}
        />
      </TabsContent>
      <TabsContent value="funil">
        <DropoffTab funnelId={funnelId} dropoff={dropoff} hasAnyData={hasAnyData} hasEnoughData={hasEnoughData} />
      </TabsContent>
      <TabsContent value="respostas">
        <AnswersTab funnelId={funnelId} answers={answers} hasAnyData={hasAnyData} hasEnoughData={hasEnoughData} />
      </TabsContent>
      <TabsContent value="origem">
        <TrafficTab funnelId={funnelId} traffic={traffic} hasAnyData={hasAnyData} hasEnoughData={hasEnoughData} />
      </TabsContent>
      <TabsContent value="rastreamento">
        <TrackingSettingsTab funnelId={funnelId} pixels={pixels} />
      </TabsContent>
      <TabsContent value="dominio">
        <DomainSettingsTab funnelId={funnelId} domains={domains} appHostname={appHostname} />
      </TabsContent>
    </Tabs>
  );
}
