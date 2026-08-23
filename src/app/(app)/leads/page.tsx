import { Users } from "lucide-react";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { Pagination } from "@/components/ui/pagination";
import { RangeSwitcher } from "@/components/ui/range-switcher";
import { formatarDataHora } from "@/lib/format";
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

  /** Mantém funil e período ao trocar de página — sem isso a paginação zera o filtro. */
  function hrefDaPagina(destino: number) {
    const params = new URLSearchParams();
    if (funil) params.set("funil", funil);
    params.set("range", rangeKey);
    params.set("page", String(destino));
    return `?${params.toString()}`;
  }

  return (
    <PageShell>
      <PageHeader
        title="Leads"
        description={
          leads.total === 0
            ? "Nenhuma resposta capturada ainda neste recorte."
            : `${leads.total} ${leads.total === 1 ? "resposta" : "respostas"} capturadas.`
        }
        action={
          <>
            <FunnelFilter funnels={funnels.map((f) => ({ id: f.id, name: f.name }))} current={funil} />
            <RangeSwitcher current={rangeKey} extraParams={{ funil }} />
          </>
        }
      />

      {leads.items.length === 0 ? (
        <EmptyState
          icon={<Users size={20} />}
          title="Nenhuma resposta neste recorte"
          description={
            funnels.length === 0
              ? "Crie um funil e publique para começar a capturar leads."
              : "Tente ampliar o período ou remover o filtro de funil."
          }
        />
      ) : (
        <>
          <DataTable>
            <TableHead>
              <tr>
                <TableHeaderCell>Contato</TableHeaderCell>
                <TableHeaderCell>Funil</TableHeaderCell>
                <TableHeaderCell>Respostas</TableHeaderCell>
                <TableHeaderCell>Pontuação</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Data</TableHeaderCell>
              </tr>
            </TableHead>
            <tbody>
              {leads.items.map((lead) => (
                <LeadRow key={lead.id} lead={lead} />
              ))}
            </tbody>
          </DataTable>

          <Pagination page={page} totalPages={totalPages} construirHref={hrefDaPagina} />
        </>
      )}
    </PageShell>
  );
}

function LeadRow({ lead }: { lead: LeadListItem }) {
  const contato = [lead.contato.nome, lead.contato.email, lead.contato.telefone].filter(Boolean);
  const resumo = resumoDeRespostas(lead);
  const completo = lead.completedAt !== null;

  return (
    <TableRow>
      <TableCell>
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
      </TableCell>
      <TableCell className="text-app-muted">{lead.funnelName}</TableCell>
      <TableCell className="max-w-72 text-app-muted">
        <span className="line-clamp-2" title={resumo}>
          {resumo || "—"}
        </span>
      </TableCell>
      <TableCell className="text-app-text tabular-nums">{lead.scoreTotal}</TableCell>
      <TableCell>
        <Badge
          tone={completo ? "success" : "neutral"}
          title={lead.outcomeId ? `Resultado: ${lead.outcomeId}` : undefined}
        >
          {completo ? "Completo" : "Incompleto"}
        </Badge>
      </TableCell>
      <TableCell className="whitespace-nowrap text-app-muted">{formatarDataHora(lead.createdAt)}</TableCell>
    </TableRow>
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
