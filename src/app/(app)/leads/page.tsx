import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { RangeSwitcher } from "@/components/ui/range-switcher";
import type { RangeKey } from "@/server/analytics/queries";
import { requireOrganization } from "@/server/auth/session";
import { listFunnels } from "@/server/funnels/queries";
import { LEADS_PAGE_SIZE, listLeads, type LeadListItem } from "@/server/leads/queries";

import { FunnelFilter } from "./funnel-filter";

export const metadata: Metadata = { title: "Leads" };

const RANGE_KEYS: RangeKey[] = ["7d", "30d", "90d", "all"];

type PageProps = {
  searchParams: Promise<{ funil?: string; range?: string; page?: string }>;
};

export default async function LeadsPage({ searchParams }: PageProps) {
  const { funil, range: rangeParam, page: pageParam } = await searchParams;
  const { organization } = await requireOrganization();

  const rangeKey: RangeKey = RANGE_KEYS.includes(rangeParam as RangeKey) ? (rangeParam as RangeKey) : "30d";
  const page = Math.max(1, Number(pageParam) || 1);

  const [funnels, leads] = await Promise.all([
    listFunnels(organization.id),
    listLeads(organization.id, { funnelId: funil || undefined, range: rangeKey, page }),
  ]);

  const totalPages = Math.max(1, Math.ceil(leads.total / LEADS_PAGE_SIZE));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="mt-1 text-sm text-app-muted">
            {leads.total === 0
              ? "Nenhuma resposta capturada ainda neste recorte."
              : `${leads.total} ${leads.total === 1 ? "resposta" : "respostas"} capturadas.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FunnelFilter funnels={funnels.map((f) => ({ id: f.id, name: f.name }))} current={funil} />
          <RangeSwitcher current={rangeKey} extraParams={{ funil }} />
        </div>
      </header>

      {leads.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-app-border px-6 py-16 text-center">
          <p className="text-app-muted">
            {funnels.length === 0
              ? "Crie um funil e publique-o para começar a capturar leads."
              : "Nenhuma resposta neste recorte ainda."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-app-border">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-app-border bg-app-surface-2 text-xs text-app-muted">
                  <th className="px-4 py-2.5 font-medium">Contato</th>
                  <th className="px-4 py-2.5 font-medium">Funil</th>
                  <th className="px-4 py-2.5 font-medium">Respostas</th>
                  <th className="px-4 py-2.5 font-medium">Pontuação</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {leads.items.map((lead) => (
                  <LeadRow key={lead.id} lead={lead} />
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm">
              <PageLink page={page - 1} disabled={page <= 1} funil={funil} range={rangeKey}>
                Anterior
              </PageLink>
              <span className="text-app-muted">
                Página {page} de {totalPages}
              </span>
              <PageLink page={page + 1} disabled={page >= totalPages} funil={funil} range={rangeKey}>
                Próxima
              </PageLink>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LeadRow({ lead }: { lead: LeadListItem }) {
  const contato = [lead.contato.nome, lead.contato.email, lead.contato.telefone].filter(Boolean);

  return (
    <tr className="border-b border-app-border last:border-0 hover:bg-app-surface-2/50">
      <td className="px-4 py-3 align-top">
        {contato.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {contato.map((valor) => (
              <span key={valor} className="text-app-text">
                {valor}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-app-muted">Sem dado de contato</span>
        )}
      </td>
      <td className="px-4 py-3 align-top text-app-muted">{lead.funnelName}</td>
      <td className="max-w-72 px-4 py-3 align-top text-app-muted">
        <span className="line-clamp-2" title={resumoDeRespostas(lead)}>
          {resumoDeRespostas(lead) || "—"}
        </span>
      </td>
      <td className="px-4 py-3 align-top text-app-text tabular-nums">{lead.scoreTotal}</td>
      <td className="px-4 py-3 align-top">
        <StatusBadge completo={lead.completedAt !== null} outcomeId={lead.outcomeId} />
      </td>
      <td className="px-4 py-3 align-top whitespace-nowrap text-app-muted">{formatarData(lead.createdAt)}</td>
    </tr>
  );
}

function StatusBadge({ completo, outcomeId }: { completo: boolean; outcomeId: string | null }) {
  return (
    <span
      className={
        completo
          ? "rounded-full bg-app-success/15 px-2 py-0.5 text-xs whitespace-nowrap text-app-success"
          : "rounded-full bg-app-surface-2 px-2 py-0.5 text-xs whitespace-nowrap text-app-muted"
      }
      title={outcomeId ? `Resultado: ${outcomeId}` : undefined}
    >
      {completo ? "Completo" : "Incompleto"}
    </span>
  );
}

function PageLink({
  page,
  disabled,
  funil,
  range,
  children,
}: {
  page: number;
  disabled: boolean;
  funil?: string;
  range: RangeKey;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span className="rounded-lg border border-app-border px-3 py-1.5 text-app-muted opacity-40">{children}</span>
    );
  }

  const params = new URLSearchParams();
  if (funil) params.set("funil", funil);
  params.set("range", range);
  params.set("page", String(page));

  return (
    <Link
      href={`?${params.toString()}`}
      className="rounded-lg border border-app-border px-3 py-1.5 transition-colors hover:border-app-primary/60 hover:text-app-text"
    >
      {children}
    </Link>
  );
}

/** Resumo em uma linha das respostas que não já aparecem na coluna Contato. */
function resumoDeRespostas(lead: LeadListItem): string {
  const chavesDeContato = new Set(
    Object.entries(lead.answers)
      .filter(([, valor]) => typeof valor === "string" && [lead.contato.nome, lead.contato.email, lead.contato.telefone].includes(valor))
      .map(([chave]) => chave),
  );

  return Object.entries(lead.answers)
    .filter(([chave]) => !chavesDeContato.has(chave))
    .map(([chave, valor]) => `${chave}: ${formatarValor(valor)}`)
    .join(" · ");
}

function formatarValor(valor: unknown): string {
  if (Array.isArray(valor)) return valor.map(String).join(", ");
  return String(valor);
}

function formatarData(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
