import "server-only";

import { and, count, desc, eq, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { funnels, responseSessions } from "@/server/db/schema";

import { since, type RangeKey } from "../analytics/queries";

export const LEADS_PAGE_SIZE = 25;

export type FunnelLeadSummary = {
  funnelId: string;
  funnelName: string;
  total: number;
  lastLeadAt: Date;
};

/**
 * Quantos leads cada funil capturou no período — a tela inicial de Leads
 * mostra isto como um seletor, em vez de já abrir com as respostas de todos os
 * funis misturadas numa tabela só (perguntas diferentes por funil, coluna
 * "Respostas" virava uma sopa de chaves sem relação entre si).
 */
export async function listFunnelLeadSummaries(
  organizationId: string,
  range: RangeKey,
): Promise<FunnelLeadSummary[]> {
  const where = and(eq(funnels.organizationId, organizationId), since(responseSessions.createdAt, diasDoRange(range)));

  const rows = await db
    .select({
      funnelId: responseSessions.funnelId,
      funnelName: funnels.name,
      total: count(),
      lastLeadAt: sql<Date>`max(${responseSessions.createdAt})`,
    })
    .from(responseSessions)
    .innerJoin(funnels, eq(responseSessions.funnelId, funnels.id))
    .where(where)
    .groupBy(responseSessions.funnelId, funnels.name)
    .orderBy(desc(sql`max(${responseSessions.createdAt})`));

  return rows;
}

export type LeadContato = { nome?: string; email?: string; telefone?: string };

export type LeadListItem = {
  id: string;
  funnelId: string;
  funnelName: string;
  contato: LeadContato;
  scoreTotal: number;
  outcomeId: string | null;
  completedAt: Date | null;
  createdAt: Date;
  answers: Record<string, unknown>;
};

export type LeadsPage = {
  items: LeadListItem[];
  total: number;
};

/**
 * Leads (sessões de resposta) de uma organização, com filtro opcional por
 * funil e por período.
 *
 * `responseSessions` não tem `organizationId` direto — o join com `funnels` é
 * o que garante o escopo por organização, no mesmo estilo de
 * `getPublishedFunnelBySlug` (`server/funnels/queries.ts`).
 */
export async function listLeads(
  organizationId: string,
  opts: { funnelId?: string; range: RangeKey; page: number },
): Promise<LeadsPage> {
  const condicoes = [eq(funnels.organizationId, organizationId), since(responseSessions.createdAt, diasDoRange(opts.range))];
  if (opts.funnelId) condicoes.push(eq(responseSessions.funnelId, opts.funnelId));

  const where = and(...condicoes);
  const offset = (Math.max(1, opts.page) - 1) * LEADS_PAGE_SIZE;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: responseSessions.id,
        funnelId: responseSessions.funnelId,
        funnelName: funnels.name,
        answers: responseSessions.answers,
        scores: responseSessions.scores,
        outcomeId: responseSessions.outcomeId,
        completedAt: responseSessions.completedAt,
        createdAt: responseSessions.createdAt,
      })
      .from(responseSessions)
      .innerJoin(funnels, eq(responseSessions.funnelId, funnels.id))
      .where(where)
      .orderBy(desc(responseSessions.createdAt))
      .limit(LEADS_PAGE_SIZE)
      .offset(offset),
    db
      .select({ total: count() })
      .from(responseSessions)
      .innerJoin(funnels, eq(responseSessions.funnelId, funnels.id))
      .where(where),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      funnelId: row.funnelId,
      funnelName: row.funnelName,
      contato: extrairContato(row.answers),
      scoreTotal: typeof row.scores.total === "number" ? row.scores.total : 0,
      outcomeId: row.outcomeId,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      answers: row.answers,
    })),
    total: totalRow?.total ?? 0,
  };
}

function diasDoRange(range: RangeKey): number | null {
  if (range === "7d") return 7;
  if (range === "90d") return 90;
  if (range === "all") return null;
  return 30;
}

const CHAVES_NOME = ["nome", "name"];
const CHAVES_EMAIL = ["email", "e-mail", "e_mail"];
const CHAVES_TELEFONE = ["telefone", "celular", "phone", "tel", "whatsapp"];

/**
 * Extração best-effort de contato a partir das respostas.
 *
 * `answers` é chaveado pelo `name` do bloco de entrada — livre, não um
 * esquema fixo. O bloco `input` do catálogo sugere "nome"/"email"/"telefone"
 * como nomes padrão (`src/funnel/blocks/definitions/input.ts`); isto cobre
 * quem seguiu a sugestão, sem exigir um esquema de contato à parte.
 */
function extrairContato(answers: Record<string, unknown>): LeadContato {
  const contato: LeadContato = {};

  for (const [chave, valor] of Object.entries(answers)) {
    if (typeof valor !== "string" || !valor.trim()) continue;
    const chaveNormalizada = chave.toLowerCase();

    if (!contato.nome && CHAVES_NOME.includes(chaveNormalizada)) contato.nome = valor;
    else if (!contato.email && CHAVES_EMAIL.includes(chaveNormalizada)) contato.email = valor;
    else if (!contato.telefone && CHAVES_TELEFONE.includes(chaveNormalizada)) contato.telefone = valor;
  }

  return contato;
}
