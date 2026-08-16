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
import {
  aiToolDescriptions,
  aiToolSchemas,
  CLIENT_SIDE_TOOLS,
  type AiToolName,
} from "@/funnel/ai/tools";
import { parseFunnelDocument } from "@/funnel/schema";
import { env } from "@/lib/env";
import { requireOrganization } from "@/server/auth/session";
import { getFunnelForOrganization } from "@/server/funnels/queries";

export const runtime = "nodejs";
/**
 * Gerar um funil inteiro passa fácil dos 30s padrão — e o modo cuidadoso, com
 * reasoning effort alto e um passo extra de plano, passa fácil dos 120s
 * antigos. Precisa ser um valor fixo (Next.js não aceita isto por requisição);
 * como o app roda self-hosted via docker-compose e não na Vercel, o teto é
 * inerte de qualquer forma — só documentando a pior hipótese.
 */
export const maxDuration = 300;

type Corpo = {
  messages: UIMessage[];
  funnelId: string;
  /** Atalho "Personalizar com IA" do fluxo: sem chat, então sem `ask_user`. */
  silent?: boolean;
  /** Modo cuidadoso: gate de plano estruturado + reasoning effort alto. */
  thorough?: boolean;
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
  const { messages, funnelId, silent, thorough } = (await request.json()) as Corpo;

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
  // Sem chat, ninguém pode responder a pergunta do `ask_user` — tirar a
  // ferramenta da lista é o que garante que o modelo nem tenta chamá-la.
  // `submit_plan` é o inverso: só entra no modo cuidadoso, porque é ela que o
  // `prepareStep` abaixo usa para travar as demais ferramentas até o plano
  // ser aceito — fora do modo cuidadoso não faria sentido nem apareceria.
  const nomesDeFerramentas = (Object.keys(aiToolSchemas) as AiToolName[]).filter(
    (nome) => (nome !== "ask_user" || !silent) && (nome !== "submit_plan" || thorough),
  );

  const ferramentas = Object.fromEntries(
    nomesDeFerramentas.map((nome) => {
      const inputSchema = jsonSchema<Record<string, unknown>>(
        z.toJSONSchema(aiToolSchemas[nome], { target: "draft-7" }) as Record<string, unknown>,
      );

      // Sem `execute`, o stream para nesta chamada e devolve o controle ao
      // cliente, que mostra o popup e responde. É o human-in-the-loop do SDK.
      if (CLIENT_SIDE_TOOLS.includes(nome)) {
        return [nome, tool({ description: aiToolDescriptions[nome], inputSchema })];
      }

      return [
        nome,
        tool({
          description: aiToolDescriptions[nome],
          inputSchema,
          execute: async (entrada: Record<string, unknown>) => {
            const resultado = aplicarChamadaDaIa(documento, nome, entrada);

            if (!resultado.ok) return { ok: false, erro: resultado.error };

            documento = resultado.doc;
            return { ok: true, resumo: resultado.resumo };
          },
        }),
      ];
    }),
  );

  const result = streamText({
    model: openrouter(env().OPENROUTER_MODEL),
    system: buildSystemPrompt(documento, { silent, thorough }),
    messages: await convertToModelMessages(messages),
    tools: ferramentas,
    // Um funil grande (15-25 telas) passa fácil de 40 chamadas somando
    // add_step + blocos + regras + o check_funnel do fim; com o teto antigo a
    // IA ficava sem passos no meio da construção. O modo cuidadoso soma um
    // passo de plano e telas mais ricas (mais blocos por tela), por isso o
    // teto sobe mais ainda.
    stopWhen: stepCountIs(thorough ? 150 : 80),
    // Repassado direto para o corpo da requisição à OpenRouter — é o único
    // provider deste projeto cujo build atual honra `reasoning`, e só por
    // aqui (o `reasoning` padrão do AI SDK não chega a ele). "Pensar mais" no
    // modo cuidadoso é isto de verdade, não só um plano mais longo em texto.
    providerOptions: thorough ? { openrouter: { reasoning: { effort: "high" } } } : undefined,
    /**
     * Sem isto, o prompt de sistema é montado uma vez, antes da primeira
     * ferramenta — o "Funil atual" nele fica congelado no estado de ANTES
     * desta rodada, e dali em diante a IA só enxerga o que criou por conta da
     * própria memória da conversa (os resumos curtos de cada chamada), nunca
     * um retrato atualizado de verdade. Num funil de 20+ telas isso é
     * exatamente onde a IA perde o fio: esquece um id, repete um nome de
     * campo, ou perde de vista uma tela criada 30 chamadas atrás.
     *
     * `prepareStep` roda antes de cada chamada dentro da mesma rodada e deixa
     * sobrescrever as instructions — então recalculamos com o `documento` já
     * mutado pelas ferramentas anteriores, e a IA sempre trabalha em cima do
     * funil como ele está agora, não como estava no começo da conversa.
     *
     * No modo cuidadoso, é também aqui que o plano vira portão: enquanto
     * nenhum `submit_plan` bem-sucedido apareceu nos passos já executados, só
     * `submit_plan` (e `ask_user`, se ainda estiver na lista) ficam
     * disponíveis, e `toolChoice: "required"` obriga o modelo a chamar uma
     * delas — sem isso ele poderia simplesmente escrever o plano em texto
     * solto (como o modo padrão ensina) e a rodada terminaria sem nunca
     * destravar as ferramentas de construção.
     */
    prepareStep: async ({ steps }) => {
      const instructions = buildSystemPrompt(documento, { silent, thorough });
      if (!thorough) return { instructions };

      const planoAceito = steps.some((step) =>
        step.toolResults.some(
          (resultado) =>
            resultado.toolName === "submit_plan" &&
            (resultado.output as { ok?: boolean } | undefined)?.ok === true,
        ),
      );
      if (planoAceito) return { instructions };

      const ferramentasDoPlano = nomesDeFerramentas.filter(
        (nome) => nome === "submit_plan" || nome === "ask_user",
      );
      return { instructions, activeTools: ferramentasDoPlano, toolChoice: "required" };
    },
  });

  return result.toUIMessageStreamResponse();
}
