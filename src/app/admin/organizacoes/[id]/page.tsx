import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { impersonateOrganizationAction } from "@/server/admin/actions";
import { getOrganizationDetail } from "@/server/admin/organizations";

import { SubscriptionOverride } from "./subscription-override";

export const metadata: Metadata = { title: "Organização" };

const RÓTULO_STATUS: Record<string, { texto: string; classe: string }> = {
  trialing: { texto: "Em teste", classe: "bg-app-surface-2 text-app-muted" },
  active: { texto: "Ativa", classe: "bg-app-success/15 text-app-success" },
  past_due: { texto: "Pendente", classe: "bg-app-danger/15 text-app-danger" },
  canceled: { texto: "Cancelada", classe: "bg-app-danger/15 text-app-danger" },
};

export default async function AdminOrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getOrganizationDetail(id);
  if (!detail) notFound();

  const rótulo = detail.subscription ? RÓTULO_STATUS[detail.subscription.status] : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
      <Link href="/admin/organizacoes" className="mb-4 flex items-center gap-1.5 text-sm text-app-muted hover:text-app-text">
        <ArrowLeft size={14} />
        Organizações
      </Link>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{detail.name}</h1>
          <p className="mt-1 text-sm text-app-muted">
            {detail.slug} · criada em {formatarData(detail.createdAt)} · {detail.funnelCount}{" "}
            {detail.funnelCount === 1 ? "funil" : "funis"}
          </p>
        </div>

        <form action={impersonateOrganizationAction.bind(null, detail.id)}>
          <button
            type="submit"
            className="rounded-lg bg-app-primary px-4 py-2 text-sm font-medium text-white hover:bg-app-primary-hover"
          >
            Impersonate
          </button>
        </form>
      </header>

      <section className="mb-6 rounded-2xl border border-app-border bg-app-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Assinatura</h2>
          {rótulo && (
            <span className={`rounded-full px-2.5 py-1 text-xs ${rótulo.classe}`}>{rótulo.texto}</span>
          )}
        </div>

        {detail.subscription ? (
          <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-app-muted">Trial expira em</dt>
            <dd className="text-app-text">
              {detail.subscription.trialEndsAt ? formatarData(detail.subscription.trialEndsAt) : "—"}
            </dd>
            <dt className="text-app-muted">Próxima cobrança</dt>
            <dd className="text-app-text">
              {detail.subscription.currentPeriodEnd ? formatarData(detail.subscription.currentPeriodEnd) : "—"}
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
      </section>

      <section className="rounded-2xl border border-app-border bg-app-surface p-5">
        <h2 className="mb-3 font-medium">Membros</h2>
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
                <span className="rounded-full bg-app-surface-2 px-2 py-0.5 text-xs text-app-muted">{m.role}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatarData(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}
