import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { formatarDataCompleta } from "@/lib/format";
import { impersonateOrganizationAction } from "@/server/admin/actions";
import { getOrganizationDetail } from "@/server/admin/organizations";

import { SubscriptionOverride } from "./subscription-override";

export const metadata: Metadata = { title: "Organização" };

const RÓTULO_STATUS: Record<string, { texto: string; tone: BadgeProps["tone"] }> = {
  trialing: { texto: "Em teste", tone: "neutral" },
  active: { texto: "Ativa", tone: "success" },
  past_due: { texto: "Pendente", tone: "warning" },
  canceled: { texto: "Cancelada", tone: "danger" },
};

export default async function AdminOrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getOrganizationDetail(id);
  if (!detail) notFound();

  const rótulo = detail.subscription ? RÓTULO_STATUS[detail.subscription.status] : null;

  return (
    <PageShell width="sm">
      <Link
        href="/admin/organizacoes"
        className="mb-4 flex items-center gap-1.5 text-sm text-app-muted hover:text-app-text"
      >
        <ArrowLeft size={14} />
        Organizações
      </Link>

      <PageHeader
        title={detail.name}
        description={`${detail.slug} · criada em ${formatarDataCompleta(detail.createdAt)} · ${detail.funnelCount} ${detail.funnelCount === 1 ? "funil" : "funis"}`}
        action={
          <form action={impersonateOrganizationAction.bind(null, detail.id)}>
            <Button type="submit" size="sm">
              Impersonate
            </Button>
          </form>
        }
      />

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader
            title="Assinatura"
            action={rótulo ? <Badge tone={rótulo.tone} size="md">{rótulo.texto}</Badge> : undefined}
          />

          {detail.subscription ? (
            <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-app-muted">Trial expira em</dt>
              <dd className="text-app-text">
                {detail.subscription.trialEndsAt ? formatarDataCompleta(detail.subscription.trialEndsAt) : "—"}
              </dd>
              <dt className="text-app-muted">Próxima cobrança</dt>
              <dd className="text-app-text">
                {detail.subscription.currentPeriodEnd
                  ? formatarDataCompleta(detail.subscription.currentPeriodEnd)
                  : "—"}
              </dd>
              <dt className="text-app-muted">Pagador (MP)</dt>
              <dd className="text-app-text">{detail.subscription.mpPayerEmail ?? "—"}</dd>
              <dt className="text-app-muted">Preapproval (MP)</dt>
              <dd className="truncate text-app-text">{detail.subscription.mpPreapprovalId ?? "—"}</dd>
            </dl>
          ) : (
            <p className="mb-4 text-sm text-app-muted">Sem assinatura registrada.</p>
          )}

          <SubscriptionOverride organizationId={detail.id} />
        </Card>

        <Card>
          <CardHeader title="Membros" />
          {detail.members.length === 0 ? (
            <p className="text-sm text-app-muted">Nenhum membro.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {detail.members.map((m) => (
                <li key={m.userId} className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="text-app-text">{m.name}</p>
                    <p className="text-xs text-app-muted">{m.email}</p>
                  </div>
                  <Badge>{m.role}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
