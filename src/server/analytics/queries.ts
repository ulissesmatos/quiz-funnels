import "server-only";

import { and, count, countDistinct, eq, sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { buildOptionLabels } from "@/funnel/logic/context";
import type { FunnelDocument } from "@/funnel/schema";
import { walkBlocks } from "@/funnel/schema/block";
import { db } from "@/server/db";
import { funnelEvents, responseSessions } from "@/server/db/schema";

import { classifyTrafficSource, type TrafficSource } from "./traffic-source";

/**
 * `from`/`to` só existem para heurísticas client-side tolerantes a alguma
 * imprecisão (granularidade do gráfico de tendência) — nunca usados para
 * filtrar linha no banco. `days` (`null` = sem teto, "tudo") é o que vira
 * predicado SQL, ver `since()` abaixo.
 */
export type DateRange = { from: Date; to: Date; days: number | null };
export type RangeKey = "7d" | "30d" | "90d" | "all";

/** Linhas cruas buscadas para agregação em JS (respostas, tráfego) — teto defensivo. */
const ROW_SAMPLE_LIMIT = 5000;
const TEXT_SAMPLE_LIMIT = 20;

/**
 * `all` busca a sessão mais antiga do funil só pra dar um `from` plausível à
 * heurística de granularidade do gráfico — não define o filtro em si (esse é
 * `days: null`, sem teto nenhum).
 */
export async function resolveDateRange(funnelId: string, key: string | undefined): Promise<DateRange> {
  const to = new Date();

  if (key === "all") {
    const [row] = await db
      .select({ min: sql<Date | null>`min(${responseSessions.createdAt})` })
      .from(responseSessions)
      .where(eq(responseSessions.funnelId, funnelId));

    return { from: row?.min ? new Date(row.min) : to, to, days: null };
  }

  const days = key === "7d" ? 7 : key === "90d" ? 90 : 30;
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  return { from, to, days };
}

/**
 * Todo `timestamp` deste schema é sem timezone (escolha pré-existente, não
 * desta feature). O driver (`postgres.js`) tem uma peculiaridade: ao ligar um
 * `Date` do JS como parâmetro contra uma coluna `timestamp` sem tz, ele aplica
 * o fuso LOCAL do processo Node em vez de UTC — então `gte(coluna, new Date())`
 * fica sistematicamente deslocado pelo fuso da máquina que roda o servidor.
 * `now() - make_interval(...)` roda inteiramente no Postgres, sem `Date` do JS
 * cruzando o driver, e por isso não sofre esse deslocamento.
 */
export function since(column: PgColumn, days: number | null): SQL {
  if (days === null) return sql`true`;
  return sql`${column} >= now() - make_interval(days => ${days})`;
}

function inRange(funnelId: string, range: DateRange) {
  return and(eq(responseSessions.funnelId, funnelId), since(responseSessions.createdAt, range.days));
}

function rate(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 1000;
}

// ── Visão geral ────────────────────────────────────────────────

export type FunnelOverview = {
  totalViews: number;
  engagedViews: number;
  engagementRate: number;
  completedSessions: number;
  completionRate: number;
  ctaClicks: number;
  ctaClickRate: number;
};

/**
 * Sessões com pelo menos um clique de saída (link/WhatsApp), como subquery
 * derivada pronta pra `leftJoin`.
 *
 * Importante: a correlação `sessionId = responseSessions.id` precisa passar
 * pelo construtor de expressões do drizzle (`eq(...)` + `leftJoin`), não por
 * um `sql\`...\`` cru — dentro de um template `sql`, `${coluna}` renderiza só
 * o nome da coluna sem prefixo de tabela, então uma referência correlacionada
 * escrita à mão (`exists (select 1 from funnel_events where session_id = id)`)
 * cai ambígua e o Postgres resolve `id` para `funnel_events.id` (o id do
 * próprio evento), não para `response_sessions.id` — sempre falso na prática.
 */
function clickedSessionsSubquery(funnelId: string, days: number | null) {
  return db
    .select({ sessionId: funnelEvents.sessionId })
    .from(funnelEvents)
    .where(and(eq(funnelEvents.funnelId, funnelId), eq(funnelEvents.type, "click"), since(funnelEvents.createdAt, days)))
    .groupBy(funnelEvents.sessionId)
    .as("clicked_sessions");
}

/**
 * "Engajada" = a sessão saiu da primeira tela ou respondeu alguma pergunta.
 * Um jeito barato de separar quem só abriu e fechou de quem de fato interagiu,
 * sem precisar de um evento novo dedicado a isso.
 */
export async function getFunnelOverview(
  funnelId: string,
  doc: FunnelDocument,
  range: DateRange,
): Promise<FunnelOverview> {
  const firstStepId = doc.steps[0]?.id ?? "";
  const clickedSessions = clickedSessionsSubquery(funnelId, range.days);

  const [totals] = await db
    .select({
      totalViews: count(),
      engagedViews: sql<number>`(count(*) filter (where ${responseSessions.lastStepId} is distinct from ${firstStepId} or ${responseSessions.answers} <> '{}'::jsonb))::int`,
      /**
       * "Concluída" = terminou pelo motor de roteamento (`completedAt`) OU saiu
       * clicando num CTA externo (link/WhatsApp). Muitos funis não têm um step
       * de `submit` — o fim de verdade é a pessoa clicar no link de checkout ou
       * WhatsApp da última tela, e isso nunca grava `completedAt` sozinho.
       */
      completedSessions: sql<number>`(count(*) filter (where ${responseSessions.completedAt} is not null or ${clickedSessions.sessionId} is not null))::int`,
    })
    .from(responseSessions)
    .leftJoin(clickedSessions, eq(clickedSessions.sessionId, responseSessions.id))
    .where(inRange(funnelId, range));

  const [clicks] = await db
    .select({ ctaClicks: countDistinct(funnelEvents.sessionId) })
    .from(funnelEvents)
    .where(
      and(
        eq(funnelEvents.funnelId, funnelId),
        eq(funnelEvents.type, "click"),
        since(funnelEvents.createdAt, range.days),
      ),
    );

  const totalViews = totals?.totalViews ?? 0;
  const engagedViews = totals?.engagedViews ?? 0;
  const completedSessions = totals?.completedSessions ?? 0;
  const ctaClicks = clicks?.ctaClicks ?? 0;

  return {
    totalViews,
    engagedViews,
    engagementRate: rate(engagedViews, totalViews),
    completedSessions,
    completionRate: rate(completedSessions, totalViews),
    ctaClicks,
    ctaClickRate: rate(ctaClicks, totalViews),
  };
}

// ── Tendência ──────────────────────────────────────────────────

export type TrendPoint = { date: string; views: number; completions: number };

/** Dia, semana ou mês — sem isto um "all" de um funil de anos vira um gráfico de milhares de pontos. */
function trendGranularity(range: DateRange): "day" | "week" | "month" {
  const days = (range.to.getTime() - range.from.getTime()) / 86_400_000;
  if (days <= 60) return "day";
  if (days <= 365) return "week";
  return "month";
}

export async function getSessionsTrend(funnelId: string, range: DateRange): Promise<TrendPoint[]> {
  const granularity = trendGranularity(range);
  const clickedSessions = clickedSessionsSubquery(funnelId, range.days);

  const rows = await db
    .select({
      bucket: sql<string>`to_char(date_trunc(${granularity}, ${responseSessions.createdAt}), 'YYYY-MM-DD')`,
      views: count(),
      // Mesma definição de "concluída" da visão geral — completedAt OU clique externo.
      completions: sql<number>`(count(*) filter (where ${responseSessions.completedAt} is not null or ${clickedSessions.sessionId} is not null))::int`,
    })
    .from(responseSessions)
    .leftJoin(clickedSessions, eq(clickedSessions.sessionId, responseSessions.id))
    .where(inRange(funnelId, range))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  return rows.map((row) => ({ date: row.bucket, views: row.views, completions: row.completions }));
}

// ── Queda por etapa ────────────────────────────────────────────

export type StepDropoff = { stepId: string; stepName: string; sessions: number; dropoffPct: number };

/**
 * `sessions` = quantas sessões viram este step. `dropoffPct` = fração dessas
 * sessões sem NENHUM evento (de qualquer tipo — outro step, resposta, clique,
 * conclusão) depois deste step-view — abandono de verdade, não presunção de
 * ordem.
 *
 * Não compara contra "o step anterior no array do documento": num funil com
 * regras de roteamento condicional, uma sessão pode pular direto do step 2
 * pro 7 sem passar pelo 3-6. Comparar contra a posição no array acusaria os
 * steps pulados de "100% de queda" quando na verdade ninguém deveria ter
 * passado por eles — o caminho real de cada sessão (via `funnel_events`,
 * ordenado por `createdAt`) é a única fonte confiável de "o que veio depois".
 */
export async function getStepDropoff(
  funnelId: string,
  doc: FunnelDocument,
  range: DateRange,
): Promise<StepDropoff[]> {
  const rows = await db
    .select({
      sessionId: funnelEvents.sessionId,
      stepId: funnelEvents.stepId,
      type: funnelEvents.type,
      createdAt: funnelEvents.createdAt,
    })
    .from(funnelEvents)
    .where(and(eq(funnelEvents.funnelId, funnelId), since(funnelEvents.createdAt, range.days)))
    .orderBy(funnelEvents.sessionId, funnelEvents.createdAt);

  const bySession = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!row.sessionId) continue;
    const list = bySession.get(row.sessionId);
    if (list) list.push(row);
    else bySession.set(row.sessionId, [row]);
  }

  const reachedBy = new Map<string, number>();
  const continuedBy = new Map<string, number>();

  for (const events of bySession.values()) {
    const visitedSteps = new Set<string>();

    events.forEach((event, index) => {
      if (event.type !== "step_view" || !event.stepId || visitedSteps.has(event.stepId)) return;
      visitedSteps.add(event.stepId);

      reachedBy.set(event.stepId, (reachedBy.get(event.stepId) ?? 0) + 1);

      // `events` já vem ordenado por `createdAt` — "tem próximo" nesta lista
      // já é "houve algo depois", de qualquer tipo.
      if (index < events.length - 1) {
        continuedBy.set(event.stepId, (continuedBy.get(event.stepId) ?? 0) + 1);
      }
    });
  }

  return doc.steps.map((step) => {
    const sessions = reachedBy.get(step.id) ?? 0;
    const continued = continuedBy.get(step.id) ?? 0;
    const dropoffPct = sessions === 0 ? 0 : Math.max(0, 1 - continued / sessions);
    return { stepId: step.id, stepName: step.name, sessions, dropoffPct };
  });
}

// ── Respostas ──────────────────────────────────────────────────

export type QuestionBreakdown =
  | {
      blockName: string;
      stepId: string;
      stepName: string;
      kind: "choice";
      multiple: boolean;
      totalResponses: number;
      options: { id: string; label: string; count: number; pct: number }[];
    }
  | {
      blockName: string;
      stepId: string;
      stepName: string;
      kind: "text";
      totalResponses: number;
      samples: string[];
    };

/**
 * Agregação acontece em JS depois de um fetch enxuto, não em SQL: respostas
 * de múltipla escolha são array dentro do jsonb, e `GROUP BY answers->>nome`
 * trataria o array inteiro como um grupo só em vez de contar cada opção.
 */
export async function getAnswerBreakdown(
  funnelId: string,
  doc: FunnelDocument,
  range: DateRange,
): Promise<QuestionBreakdown[]> {
  const rows = await db
    .select({ answers: responseSessions.answers })
    .from(responseSessions)
    .where(inRange(funnelId, range))
    .limit(ROW_SAMPLE_LIMIT);

  const optionLabels = buildOptionLabels(doc);
  const breakdowns: QuestionBreakdown[] = [];

  for (const step of doc.steps) {
    for (const block of walkBlocks(step.blocks)) {
      if (block.type === "choice") {
        const counts = new Map<string, number>();
        let totalResponses = 0;

        for (const row of rows) {
          const value = row.answers[block.props.name];
          if (value === undefined || value === null) continue;
          totalResponses++;

          const selected = Array.isArray(value) ? value : [value];
          for (const optionId of selected) {
            const key = String(optionId);
            counts.set(key, (counts.get(key) ?? 0) + 1);
          }
        }

        const labels = optionLabels[block.props.name] ?? {};
        breakdowns.push({
          blockName: block.props.name,
          stepId: step.id,
          stepName: step.name,
          kind: "choice",
          multiple: block.props.multiple,
          totalResponses,
          options: block.props.options.map((option) => ({
            id: option.id,
            label: labels[option.id] ?? option.label,
            count: counts.get(option.id) ?? 0,
            pct: rate(counts.get(option.id) ?? 0, totalResponses),
          })),
        });
      }

      if (block.type === "input") {
        const samples: string[] = [];
        let totalResponses = 0;

        for (const row of rows) {
          const value = row.answers[block.props.name];
          if (value === undefined || value === null || value === "") continue;
          totalResponses++;

          const text = String(value);
          if (samples.length < TEXT_SAMPLE_LIMIT && !samples.includes(text)) samples.push(text);
        }

        breakdowns.push({
          blockName: block.props.name,
          stepId: step.id,
          stepName: step.name,
          kind: "text",
          totalResponses,
          samples,
        });
      }
    }
  }

  return breakdowns;
}

// ── Origem do tráfego ──────────────────────────────────────────

export type TrafficSourceBreakdown = { source: TrafficSource; sessions: number; pct: number };

const TRAFFIC_SOURCE_ORDER: TrafficSource[] = [
  "direto",
  "pago",
  "campanha",
  "busca_organica",
  "social",
  "referencia",
];

export async function getTrafficSources(funnelId: string, range: DateRange): Promise<TrafficSourceBreakdown[]> {
  const rows = await db
    .select({ utm: responseSessions.utm, referrer: responseSessions.referrer })
    .from(responseSessions)
    .where(inRange(funnelId, range))
    .limit(ROW_SAMPLE_LIMIT);

  const counts = new Map<TrafficSource, number>();
  for (const row of rows) {
    const source = classifyTrafficSource(row.utm, row.referrer);
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }

  const total = rows.length;

  return TRAFFIC_SOURCE_ORDER.map((source) => ({
    source,
    sessions: counts.get(source) ?? 0,
    pct: rate(counts.get(source) ?? 0, total),
  })).filter((entry) => entry.sessions > 0);
}
