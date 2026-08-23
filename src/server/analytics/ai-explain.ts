"use server";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

import { env } from "@/lib/env";
import { requireOrganization } from "@/server/auth/session";
import { getFunnelForOrganization } from "@/server/funnels/queries";

import { MIN_SESSIONS_FOR_INSIGHTS } from "./constants";

export type AnalyticsSection = "visao_geral" | "funil" | "respostas" | "origem";

const SECTION_TITLES: Record<AnalyticsSection, string> = {
  visao_geral: "visão geral (visualizações, engajamento, conclusão, cliques em CTA)",
  funil: "queda de sessões por etapa do funil",
  respostas: "distribuição das respostas às perguntas",
  origem: "origem do tráfego dos visitantes",
};

const MAX_METRICS_JSON_LENGTH = 8000;

export type ExplainResult = { ok: true; text: string } | { ok: false; error: string };

/**
 * Explicação curta e não-streaming dos números de uma seção do dashboard —
 * mesmo guard de `env().OPENROUTER_API_KEY` + `requireOrganization()` da rota
 * do copiloto (`api/ai/chat/route.ts`), mas `generateText` no lugar de
 * `streamText`: a resposta é curta o bastante pra não precisar de stream.
 *
 * `sampleSize` é reforçado aqui mesmo já vindo filtrado da UI — defesa em
 * profundidade contra uma chamada direto da action, sem gastar tokens à toa
 * quando não há dado suficiente.
 */
export async function explainAnalyticsAction(
  funnelId: string,
  section: AnalyticsSection,
  metrics: Record<string, unknown>,
  sampleSize: number,
): Promise<ExplainResult> {
  const chave = env().OPENROUTER_API_KEY;
  if (!chave) return { ok: false, error: "Defina OPENROUTER_API_KEY no .env para usar a IA." };

  if (sampleSize < MIN_SESSIONS_FOR_INSIGHTS) {
    return { ok: false, error: "Dados insuficientes para uma análise confiável ainda." };
  }

  const { organization } = await requireOrganization();
  const funnel = await getFunnelForOrganization(funnelId, organization.id);
  if (!funnel) return { ok: false, error: "Funil não encontrado." };

  const metricsJson = JSON.stringify(metrics);
  if (metricsJson.length > MAX_METRICS_JSON_LENGTH) {
    return { ok: false, error: "Dados grandes demais para analisar." };
  }

  const openrouter = createOpenRouter({ apiKey: chave });

  try {
    const result = await generateText({
      model: openrouter(env().OPENROUTER_MODEL),
      system:
        "Você é um analista de marketing e CRO explicando métricas de um funil de quiz para o dono do negócio. " +
        "Responda em português do Brasil, em no máximo 3 parágrafos curtos ou uma lista de até 5 itens. " +
        "Seja direto: diga o que os números indicam e sugira 1 ou 2 ações concretas. Nunca invente números que " +
        "não estejam nos dados fornecidos.",
      prompt: `Métricas de ${SECTION_TITLES[section]} do funil "${funnel.name}":\n\n${metricsJson}`,
      maxOutputTokens: 500,
    });

    return { ok: true, text: result.text };
  } catch {
    return { ok: false, error: "Não foi possível gerar a explicação agora. Tente de novo em instantes." };
  }
}
