import "server-only";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import type { FunnelDocument } from "@/funnel/schema";
import { since } from "@/server/analytics/queries";
import { db } from "@/server/db";
import { funnels, funnelVersions, responseSessions } from "@/server/db/schema";

/** Contagem vitalícia (sem janela de data) — é contra isto que o limite de leads do plano compara. */
export async function countLeadsForFunnel(funnelId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(responseSessions)
    .where(eq(responseSessions.funnelId, funnelId));

  return row?.total ?? 0;
}

export type FunnelStats = {
  views: number;
  completions: number;
  conversionRate: number;
};

export type FunnelListItem = {
  id: string;
  slug: string;
  name: string;
  status: "draft" | "published" | "archived";
  stepCount: number;
  updatedAt: Date;
  isPublished: boolean;
  preview: FunnelPreview;
  stats: FunnelStats;
};

/**
 * Retrato mínimo da primeira tela, para desenhar uma miniatura fiel do funil
 * na listagem — cores, fonte e formato de botão que o cliente escolheu, mais o
 * texto real que está lá.
 *
 * Extraído aqui, no servidor, porque `listFunnels` já carrega o documento
 * inteiro (usava só `steps.length`): sai de graça, e evita mandar o documento
 * completo de 128 funis pro navegador só pra desenhar um quadradinho.
 */
export type FunnelPreview = {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  primary: string;
  primaryFg: string;
  border: string;
  fonteTitulo: string;
  fonteCorpo: string;
  raioBotao: number;
  titulo: string | null;
  subtitulo: string | null;
  botao: string | null;
  temImagem: boolean;
  /** Texto real de até 3 opções de escolha (ou rótulos de campo) — nunca uma barra vazia sem sentido. */
  campos: string[];
};

/** Tira markdown inline e `{{variaveis}}` — a miniatura mostra texto puro. */
function textoSimples(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
  return limpo || null;
}

function montarPreview(document: FunnelDocument): FunnelPreview {
  const { colors, typography, radius, button } = document.theme;
  const primeiraTela = document.steps[0];

  // Percorre em profundidade: blocos podem estar dentro de containers.
  const blocos: { type: string; props: Record<string, unknown> }[] = [];
  function coletar(lista: unknown) {
    if (!Array.isArray(lista)) return;
    for (const bloco of lista as { type?: string; props?: Record<string, unknown> }[]) {
      if (!bloco?.type) continue;
      blocos.push({ type: bloco.type, props: bloco.props ?? {} });
      coletar((bloco.props as { blocks?: unknown } | undefined)?.blocks);
    }
  }
  coletar(primeiraTela?.blocks);

  const titulos = blocos.filter((b) => b.type === "heading");
  const textos = blocos.filter((b) => b.type === "text");
  const botao = blocos.find((b) => b.type === "button");
  const escolha = blocos.find((b) => b.type === "choice");
  const camposDeInput = blocos.filter((b) => b.type === "input");

  // Texto de verdade das opções/campos — miniatura antiga desenhava barras
  // vazias aqui (mesma altura, sem nada dentro), que pareciam placeholder
  // quebrado em vez de prévia de conteúdo.
  let campos: string[] = [];
  if (escolha && Array.isArray(escolha.props.options)) {
    campos = (escolha.props.options as { label?: unknown }[])
      .map((opcao) => textoSimples(opcao.label))
      .filter((texto): texto is string => texto !== null)
      .slice(0, 3);
  } else if (camposDeInput.length > 0) {
    campos = camposDeInput
      .map((campo) => textoSimples(campo.props.label) ?? textoSimples(campo.props.placeholder))
      .filter((texto): texto is string => texto !== null)
      .slice(0, 3);
  }

  const raioNomeado = button.radius;
  const raioBotao =
    raioNomeado === "none" ? 0 : raioNomeado === "full" ? 999 : radius[raioNomeado];

  return {
    bg: colors.bg,
    surface: colors.surface,
    text: colors.text,
    muted: colors.muted,
    primary: colors.primary,
    primaryFg: colors.primaryFg,
    border: colors.border,
    fonteTitulo: typography.heading.family,
    fonteCorpo: typography.body.family,
    raioBotao,
    titulo: textoSimples(titulos[0]?.props.text),
    subtitulo: textoSimples(textos[0]?.props.text) ?? textoSimples(titulos[1]?.props.text),
    botao: textoSimples(botao?.props.label),
    temImagem: blocos.some((b) => b.type === "image" || b.type === "video"),
    campos,
  };
}

/**
 * Views e conclusões dos últimos 30 dias, para todos os funis de uma vez —
 * uma consulta agrupada em vez de uma por card, que ficaria pesado numa
 * organização com centenas de funis.
 */
async function statsPorFunil(funnelIds: string[]): Promise<Map<string, FunnelStats>> {
  const mapa = new Map<string, FunnelStats>();
  if (funnelIds.length === 0) return mapa;

  const linhas = await db
    .select({
      funnelId: responseSessions.funnelId,
      views: count(),
      completions: sql<number>`(count(*) filter (where ${responseSessions.completedAt} is not null))::int`,
    })
    .from(responseSessions)
    .where(and(inArray(responseSessions.funnelId, funnelIds), since(responseSessions.createdAt, 30)))
    .groupBy(responseSessions.funnelId);

  for (const linha of linhas) {
    mapa.set(linha.funnelId, {
      views: linha.views,
      completions: linha.completions,
      conversionRate: linha.views > 0 ? Math.round((linha.completions / linha.views) * 1000) / 1000 : 0,
    });
  }

  return mapa;
}

const SEM_DADOS: FunnelStats = { views: 0, completions: 0, conversionRate: 0 };

export async function listFunnels(organizationId: string): Promise<FunnelListItem[]> {
  const rows = await db
    .select({
      id: funnels.id,
      slug: funnels.slug,
      name: funnels.name,
      status: funnels.status,
      document: funnels.document,
      updatedAt: funnels.updatedAt,
      publishedVersionId: funnels.publishedVersionId,
    })
    .from(funnels)
    .where(eq(funnels.organizationId, organizationId))
    .orderBy(desc(funnels.updatedAt));

  const stats = await statsPorFunil(rows.map((row) => row.id));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    stepCount: row.document.steps.length,
    updatedAt: row.updatedAt,
    isPublished: row.publishedVersionId !== null,
    preview: montarPreview(row.document),
    stats: stats.get(row.id) ?? SEM_DADOS,
  }));
}

/** Rascunho de um funil, restrito à organização — nunca busque só por id. */
export async function getFunnelForOrganization(funnelId: string, organizationId: string) {
  const [row] = await db
    .select()
    .from(funnels)
    .where(and(eq(funnels.id, funnelId), eq(funnels.organizationId, organizationId)))
    .limit(1);

  return row ?? null;
}

/**
 * Documento de uma versão publicada específica — é o que gerou os eventos de
 * telemetria daquele período, então rótulos de step/opção devem vir daqui, não
 * do rascunho atual (que pode ter mudado desde então).
 */
export async function getFunnelVersionDocument(versionId: string): Promise<FunnelDocument | null> {
  const [row] = await db
    .select({ document: funnelVersions.document })
    .from(funnelVersions)
    .where(eq(funnelVersions.id, versionId))
    .limit(1);

  return row?.document ?? null;
}

/**
 * Versão publicada de um funil pelo slug — é o que a página pública serve.
 * Rascunhos nunca aparecem aqui: editar não pode alterar o que está no ar.
 */
export async function getPublishedFunnelBySlug(slug: string): Promise<{
  funnelId: string;
  versionId: string;
  document: FunnelDocument;
} | null> {
  const [row] = await db
    .select({
      funnelId: funnels.id,
      versionId: funnelVersions.id,
      document: funnelVersions.document,
    })
    .from(funnels)
    .innerJoin(funnelVersions, eq(funnels.publishedVersionId, funnelVersions.id))
    .where(and(eq(funnels.slug, slug), eq(funnels.status, "published")))
    .limit(1);

  return row ?? null;
}

/** Dados mínimos para o sitemap — somente versões que estão no ar. */
export async function listPublishedFunnelsForSitemap(): Promise<
  Array<{ slug: string; updatedAt: Date; document: FunnelDocument }>
> {
  return db
    .select({
      slug: funnels.slug,
      updatedAt: funnels.updatedAt,
      document: funnelVersions.document,
    })
    .from(funnels)
    .innerJoin(funnelVersions, eq(funnels.publishedVersionId, funnelVersions.id))
    .where(eq(funnels.status, "published"));
}
