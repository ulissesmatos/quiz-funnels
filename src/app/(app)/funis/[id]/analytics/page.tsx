import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { RangeSwitcher } from "@/components/ui/range-switcher";
import { parseFunnelDocument } from "@/funnel/schema";
import { env } from "@/lib/env";
import { MIN_SESSIONS_FOR_INSIGHTS } from "@/server/analytics/constants";
import {
  getAnswerBreakdown,
  getFunnelOverview,
  getSessionsTrend,
  getStepDropoff,
  getTrafficSources,
  resolveDateRange,
  type RangeKey,
} from "@/server/analytics/queries";
import { requireOrganization } from "@/server/auth/session";
import { listFunnelDomains } from "@/server/domains/queries";
import { getFunnelForOrganization, getFunnelVersionDocument } from "@/server/funnels/queries";

import { AnalyticsTabs } from "./analytics-tabs";

export const metadata: Metadata = { title: "Analytics do funil" };

const RANGE_KEYS: RangeKey[] = ["7d", "30d", "90d", "all"];

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
};

export default async function FunnelAnalyticsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { range: rangeParam } = await searchParams;
  const { organization } = await requireOrganization();

  const funnel = await getFunnelForOrganization(id, organization.id);
  if (!funnel) notFound();

  const rangeKey: RangeKey = RANGE_KEYS.includes(rangeParam as RangeKey) ? (rangeParam as RangeKey) : "30d";

  // Rótulos (nome de step, opção) vêm da versão publicada — foi ela que gerou
  // os eventos. Sem publicação ainda, cai no rascunho: não há tráfego mesmo.
  const publishedDocument = funnel.publishedVersionId
    ? await getFunnelVersionDocument(funnel.publishedVersionId)
    : null;
  const analyticsDoc = parseFunnelDocument(publishedDocument ?? funnel.document);
  if (!analyticsDoc.success) notFound();

  // O pixel exibido no formulário é sempre o do rascunho — é o que a pessoa
  // está editando, publicado ou não.
  const draftDoc = parseFunnelDocument(funnel.document);
  const pixels = draftDoc.success ? draftDoc.data.settings.pixels : {};

  const range = await resolveDateRange(id, rangeKey);

  const [overview, trend, dropoff, answers, traffic, domains] = await Promise.all([
    getFunnelOverview(id, analyticsDoc.data, range),
    getSessionsTrend(id, range),
    getStepDropoff(id, analyticsDoc.data, range),
    getAnswerBreakdown(id, analyticsDoc.data, range),
    getTrafficSources(id, range),
    listFunnelDomains(id),
  ]);

  const appHostname = new URL(env().BETTER_AUTH_URL).host;

  const hasAnyData = overview.totalViews > 0;
  const hasEnoughData = overview.totalViews >= MIN_SESSIONS_FOR_INSIGHTS;

  return (
    <PageShell>
      <Link href="/funis" className="mb-4 flex items-center gap-1.5 text-sm text-app-muted hover:text-app-text">
        <ArrowLeft size={14} /> Funis
      </Link>

      <PageHeader
        title={funnel.name}
        description="Analytics e rastreamento deste funil."
        action={<RangeSwitcher current={rangeKey} />}
      />

      <AnalyticsTabs
        funnelId={id}
        overview={overview}
        trend={trend}
        dropoff={dropoff}
        answers={answers}
        traffic={traffic}
        pixels={pixels}
        domains={domains}
        appHostname={appHostname}
        hasAnyData={hasAnyData}
        hasEnoughData={hasEnoughData}
      />
    </PageShell>
  );
}
