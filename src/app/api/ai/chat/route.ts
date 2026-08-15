import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  convertToModelMessages,
  jsonSchema,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { aplicarChamadaDaIa } from "@/funnel/ai/apply";
import { buildSystemPrompt } from "@/funnel/ai/prompt";
import { aiToolDescriptions, aiToolSchemas, type AiToolName } from "@/funnel/ai/tools";
import { parseFunnelDocument } from "@/funnel/schema";
import { env } from "@/lib/env";
import { requireOrganization } from "@/server/auth/session";
import { getFunnelForOrganization } from "@/server/funnels/queries";

export const runtime = "nodejs";
/** Gerar um funil inteiro passa fácil dos 30s padrão. */
export const maxDuration = 120;

type Corpo = {
  messages: UIMessage[];
  funnelId: string;
};

export async function POST(request: Request) {
  const chave = env().OPENROUTER_API_KEY;
  if (!chave) {
    return NextResponse.json(
      { error: "Defina OPENROUTER_API_KEY no .env para usar o copiloto." },
      { status: 503 },
    );
  }

  const { organization } = await requireOrganization();
  const { messages, funnelId } = (await request.json()) as Corpo;

  const funnel = await getFunnelForOrganization(funnelId, organization.id);
  if (!funnel) return NextResponse.json({ error: "Funil não encontrado." }, { status: 404 });

  const parsed = parseFunnelDocument(funnel.document);
  if (!parsed.success) {
    return NextResponse.json({ error: "O documento deste funil está inválido." }, { status: 422 });
  }

  /**
   * O servidor mantém o próprio documento ao longo da conversa.
   *
   * Sem isso, cada ferramenta validaria contra o funil como ele estava no
   * início: a segunda chamada não enxergaria a tela criada pela primeira, e o
   * modelo receberia "essa tela não existe" logo depois de criá-la.
   */
  let documento = parsed.data;

  const openrouter = createOpenRouter({ apiKey: chave });

  /**
   * O schema vai como JSON Schema em vez do objeto Zod.
   *
   * O AI SDK aceita os dois, mas a tipagem dele ainda casa com o Zod 3 e o
   * projeto usa o 4 — converter aqui evita o desencontro e deixa explícito o
   * contrato que o modelo realmente recebe.
   */
  const ferramentas = Object.fromEntries(
    (Object.keys(aiToolSchemas) as AiToolName[]).map((nome) => [
      nome,
      tool({
        description: aiToolDescriptions[nome],
        inputSchema: jsonSchema<Record<string, unknown>>(
          z.toJSONSchema(aiToolSchemas[nome], { target: "draft-7" }) as Record<string, unknown>,
        ),
        execute: async (entrada: Record<string, unknown>) => {
          const resultado = aplicarChamadaDaIa(documento, nome, entrada);

          if (!resultado.ok) return { ok: false, erro: resultado.error };

          documento = resultado.doc;
          return { ok: true, resumo: resultado.resumo };
        },
      }),
    ]),
  );

  const result = streamText({
    model: openrouter(env().OPENROUTER_MODEL),
    system: buildSystemPrompt(documento),
    messages: await convertToModelMessages(messages),
    tools: ferramentas,
    // Cada tela é uma sequência de chamadas; sem várias rodadas o modelo pararia
    // depois da primeira ferramenta e deixaria o funil pela metade.
    stopWhen: stepCountIs(40),
  });

  return result.toUIMessageStreamResponse();
}
