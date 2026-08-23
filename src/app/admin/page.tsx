import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { cn } from "@/lib/cn";
import { formatarDataHora, formatarPreco } from "@/lib/format";
import { getAdminDashboardMetrics } from "@/server/admin/dashboard";

export const metadata: Metadata = { title: "Painel do operador" };

const RÓTULO_AÇÃO: Record<string, string> = {
  impersonate_start: "iniciou impersonate em",
  impersonate_stop: "encerrou impersonate em",
  subscription_override: "ajustou a assinatura de",
  promote_super_admin: "promoveu a super admin",
  demote_super_admin: "removeu super admin de",
};

export default async function AdminDashboardPage() {
  const metrics = await getAdminDashboardMetrics();
  const { subscriptionCounts } = metrics;

  return (
    <PageShell>
      <PageHeader title="Dashboard" description="Visão geral de todas as organizações que usam o SaaS." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Organizações" value={String(metrics.totalOrganizations)} />
        <MetricCard label="MRR" value={formatarPreco(metrics.mrrCents)} tom="sucesso" />
        <MetricCard label="Em trial" value={String(subscriptionCounts.trialing)} />
        <MetricCard
          label="Precisam de atenção"
          value={String(subscriptionCounts.past_due + subscriptionCounts.canceled)}
          tom={subscriptionCounts.past_due + subscriptionCounts.canceled > 0 ? "alerta" : undefined}
        />
        <MetricCard label="Cadastros (7d)" value={String(metrics.signupsLast7d)} />
        <MetricCard label="Cadastros (30d)" value={String(metrics.signupsLast30d)} />
        <MetricCard
          label="Erros (24h)"
          value={String(metrics.errorsLast24h)}
          tom={metrics.errorsLast24h > 0 ? "alerta" : undefined}
        />
        <MetricCard label="Assinaturas ativas" value={String(subscriptionCounts.active)} />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <Painel titulo="Últimas organizações" verMaisHref="/admin/organizacoes">
          {metrics.recentOrganizations.length === 0 ? (
            <VazioLinha />
          ) : (
            metrics.recentOrganizations.map((org) => (
              <Link
                key={org.id}
                href={`/admin/organizacoes/${org.id}`}
                className="flex flex-col gap-0.5 rounded-lg px-2 py-1.5 text-sm hover:bg-app-surface-2"
              >
                <span className="text-app-text">{org.name}</span>
                <span className="text-xs text-app-muted">{formatarDataHora(org.createdAt)}</span>
              </Link>
            ))
          )}
        </Painel>

        <Painel titulo="Erros recentes" verMaisHref="/admin/erros">
          {metrics.recentErrors.length === 0 ? (
            <VazioLinha />
          ) : (
            metrics.recentErrors.map((log) => (
              <div key={log.id} className="rounded-lg px-2 py-1.5 text-sm">
                <p className="truncate text-app-text">{log.message}</p>
                <p className="text-xs text-app-muted">
                  {log.source} · {formatarDataHora(log.createdAt)}
                </p>
              </div>
            ))
          )}
        </Painel>

        <Painel titulo="Atividade de admin" verMaisHref="/admin/auditoria">
          {metrics.recentAuditEntries.length === 0 ? (
            <VazioLinha />
          ) : (
            metrics.recentAuditEntries.map((entry) => (
              <div key={entry.id} className="rounded-lg px-2 py-1.5 text-sm">
                <p className="text-app-text">
                  {entry.actorName} {RÓTULO_AÇÃO[entry.action] ?? entry.action}
                </p>
                <p className="text-xs text-app-muted">{formatarDataHora(entry.createdAt)}</p>
              </div>
            ))
          )}
        </Painel>
      </div>
    </PageShell>
  );
}

function MetricCard({ label, value, tom }: { label: string; value: string; tom?: "sucesso" | "alerta" }) {
  return (
    <Card padding="sm">
      <p className="text-xs text-app-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold tabular-nums",
          tom === "sucesso" ? "text-app-success" : tom === "alerta" ? "text-app-danger" : "text-app-text",
        )}
      >
        {value}
      </p>
    </Card>
  );
}

function Painel({ titulo, verMaisHref, children }: { titulo: string; verMaisHref: string; children: ReactNode }) {
  return (
    <Card padding="sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium">{titulo}</h2>
        <Link href={verMaisHref} className="text-xs text-app-primary hover:underline">
          Ver tudo
        </Link>
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </Card>
  );
}

function VazioLinha() {
  return <p className="px-2 py-1.5 text-sm text-app-muted">Nada por aqui ainda.</p>;
}
