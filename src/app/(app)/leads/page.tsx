import { ArrowLeft, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import {
  LEADS_PAGE_SIZE,
  listFunnelLeadSummaries,
  listLeads,
  type FunnelLeadSummary,
  type LeadListItem,
} from "@/server/leads/queries";

import { FunnelFilter } from "./funnel-filter";

export const metadata: Metadata = { title: "Leads" };

const RANGE_KEYS: RangeKey[] = ["7d", "30d", "90d", "all"];

type PageProps = {
  searchParams: Promise<{ funil?: string; range?: string; page?: string; todos?: string }>;
};

export default async function LeadsPage({ searchParams }: PageProps) {
  const { funil, range: rangeParam, page: pageParam, todos } = await searchParams;
  const { organization } = await requireOrganization();

  const rangeKey: RangeKey = RANGE_KEYS.includes(rangeParam as RangeKey) ? (rangeParam as RangeKey) : "30d";

  // Sem funil escolhido e sem pedir a visão combinada de propósito: mostra o
  // seletor em vez de já abrir com as respostas de todo mundo misturadas.
  // Funis diferentes têm perguntas diferentes — numa tabela só, a coluna
  // "Respostas" virava uma sopa de chaves sem relação nenhuma entre as linhas.
  if (!funil && todos !== "1") {
    return <SeletorDeFunil organizationId={organization.id} rangeKey={rangeKey} />;
  }

  const page = Math.max(1, Number(pageParam) || 1);

  const [funnels, leads] = await Promise.all([
    listFunnels(organization.id),
    listLeads(organization.id, { funnelId: funil || undefined, range: rangeKey, page }),
  ]);

  const totalPages = Math.max(1, Math.ceil(leads.total / LEADS_PAGE_SIZE));
  const funilAtual = funnels.find((f) => f.id === funil);

  /** Mantém funil e período ao trocar de página — sem isso a paginação zera o filtro. */
  function hrefDaPagina(destino: number) {
    const params = new URLSearchParams();
    if (funil) params.set("funil", funil);
    if (todos === "1") params.set("todos", "1");
    params.set("range", rangeKey);
    params.set("page", String(destino));
    return `?${params.toString()}`;
  }

  return (
    <PageShell>
      <PageHeader
        title={
          <span className="flex items-center gap-1.5">
            <Link
              href="/leads"
              aria-label="Voltar ao seletor de funis"
              title="Voltar ao seletor de funis"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-app-muted transition-colors duration-150 ease-app hover:bg-app-surface-2 hover:text-app-text"
            >
              <ArrowLeft size={16} />
            </Link>
            {funilAtual ? funilAtual.name : "Todos os funis"}
          </span>
        }
        description={
          leads.total === 0
            ? "Nenhuma resposta capturada ainda neste recorte."
            : `${leads.total} ${leads.total === 1 ? "resposta" : "respostas"} capturadas.`
        }
        action={
          <>
            <FunnelFilter funnels={funnels.map((f) => ({ id: f.id, name: f.name }))} current={funil} />
            <RangeSwitcher current={rangeKey} extraParams={{ funil, todos }} />
          </>
        }
      />

      {leads.items.length === 0 ? (
        <EmptyState
          icon={<Users size={20} />}
          title="Nenhuma resposta neste recorte"
          description="Tente ampliar o período ou escolher outro funil."
        />
      ) : (
        <>
          <DataTable>
            <TableHead>
              <tr>
                <TableHeaderCell>Contato</TableHeaderCell>
                {/* Repetiria o mesmo nome em toda linha quando um funil já está
                    escolhido — só faz sentido na visão combinada. */}
                {!funil && <TableHeaderCell>Funil</TableHeaderCell>}
                <TableHeaderCell>Respostas</TableHeaderCell>
                <TableHeaderCell>Pontuação</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Data</TableHeaderCell>
              </tr>
            </TableHead>
            <tbody>
              {leads.items.map((lead) => (
                <LeadRow key={lead.id} lead={lead} mostrarFunil={!funil} />
              ))}
            </tbody>
          </DataTable>

          <Pagination page={page} totalPages={totalPages} construirHref={hrefDaPagina} />
        </>
      )}
    </PageShell>
  );
}

/**
 * Tela inicial de Leads: um funil por cartão, com quantos leads ele capturou
 * no período — escolher um antes de ver a tabela evita a mistura de
 * perguntas diferentes na mesma lista.
 */
async function SeletorDeFunil({ organizationId, rangeKey }: { organizationId: string; rangeKey: RangeKey }) {
  const resumos = await listFunnelLeadSummaries(organizationId, rangeKey);

  return (
    <PageShell>
      <PageHeader
        title="Leads"
        description="Escolha um funil para ver as respostas capturadas — cada um tem perguntas diferentes, por isso ficam separados."
        action={<RangeSwitcher current={rangeKey} />}
      />

      {resumos.length === 0 ? (
        <EmptyState
          icon={<Users size={20} />}
          title="Nenhuma resposta neste recorte"
          description="Crie um funil e publique para começar a capturar leads."
        />
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {resumos.map((resumo) => (
              <li key={resumo.funnelId}>
                <CartaoDeFunil resumo={resumo} rangeKey={rangeKey} />
              </li>
            ))}
          </ul>

          <p className="mt-5 text-center text-xs text-app-muted">
            <Link
              href={`/leads?todos=1&range=${rangeKey}`}
              className="underline underline-offset-2 hover:text-app-text"
            >
              Ver todos os funis misturados
            </Link>
          </p>
        </>
      )}
    </PageShell>
  );
}

function CartaoDeFunil({ resumo, rangeKey }: { resumo: FunnelLeadSummary; rangeKey: RangeKey }) {
  return (
    <Link href={`/leads?funil=${resumo.funnelId}&range=${rangeKey}`}>
      <Card interactive className="h-full">
        <p className="font-semibold tracking-tight">{resumo.funnelName}</p>
        <p className="mt-1.5 text-sm text-app-muted">
          <span className="font-mono text-app-text tabular-nums">{resumo.total}</span>{" "}
          {resumo.total === 1 ? "lead" : "leads"}
        </p>
        <p className="mt-0.5 text-xs text-app-muted">Último em {formatarDataHora(resumo.lastLeadAt)}</p>
      </Card>
    </Link>
  );
}

function LeadRow({ lead, mostrarFunil }: { lead: LeadListItem; mostrarFunil: boolean }) {
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
      {mostrarFunil && <TableCell className="text-app-muted">{lead.funnelName}</TableCell>}
      <TableCell className="max-w-72 text-app-muted">
        <span className="line-clamp-2" title={resumo}>
          {resumo || "—"}
        </span>
      </TableCell>
      <TableCell className="text-app-text tabular-nums">{lead.scoreTotal}</TableCell>
      <TableCell>
        <Badge
          tone={completo ? "success" : "neutral"}
          dot
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
