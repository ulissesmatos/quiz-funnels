import { z } from "zod";

import { SlugId, VariableKey } from "../schema/common";

/**
 * Ferramentas do copiloto.
 *
 * As `props` de bloco entram como objeto livre, e não como a união dos 14
 * schemas. O motivo é prático: aquela união vira um JSON Schema enorme e
 * recursivo (condições aninhadas), que parte dos modelos recusa ou preenche
 * mal. Aqui o contrato de verdade está no prompt — que já lista cada bloco com
 * descrição e exemplo — e a validação acontece na aplicação, devolvendo o erro
 * ao modelo para ele corrigir na chamada seguinte.
 */

const BlockProps = z
  .record(z.string(), z.unknown())
  .describe("Objeto de props do bloco, no formato exato do exemplo daquele tipo");

/** Condição achatada: um nível de E/OU, sem aninhamento. */
export const AiCondition = z
  .object({
    match: z.enum(["all", "any"]).describe("all = todas as regras; any = qualquer uma"),
    rules: z
      .array(
        z.object({
          source: z
            .enum(["answer", "score", "variable"])
            .describe("answer = resposta de um campo; score = pontuação; variable = parâmetro de URL"),
          key: VariableKey.optional().describe(
            "Nome do campo, da categoria de pontuação ou da variável. Omitir só para a pontuação total.",
          ),
          op: z.enum(["eq", "neq", "contains", "not_contains", "gt", "gte", "lt", "lte", "is_set", "is_empty"]),
          value: z.union([z.string(), z.number(), z.boolean()]).optional(),
        }),
      )
      .min(1),
  })
  .strict();

export type AiCondition = z.infer<typeof AiCondition>;

export const aiToolSchemas = {
  add_step: z
    .object({
      name: z.string().min(1).describe("Nome da tela, visível só no editor"),
      type: z
        .enum(["question", "content", "loading", "result", "form", "checkout"])
        .describe("question = uma pergunta; loading = personalizando o plano; result = diagnóstico"),
      afterStepId: SlugId.optional().describe("Insere depois desta tela; omitido, entra no fim"),
      id: SlugId.optional().describe("Id sugerido; se colidir, ganha sufixo automaticamente"),
    })
    .strict(),

  update_step: z
    .object({
      stepId: SlugId,
      name: z.string().optional(),
      type: z.enum(["question", "content", "loading", "result", "form", "checkout"]).optional(),
      align: z.enum(["left", "center"]).optional(),
      fullHeight: z.boolean().optional().describe("Centraliza o conteúdo verticalmente"),
      isEnd: z.boolean().optional().describe("Encerra o funil nesta tela"),
    })
    .strict(),

  remove_step: z.object({ stepId: SlugId }).strict(),

  add_block: z
    .object({
      stepId: SlugId.describe("Tela que recebe o bloco"),
      type: z.string().describe("Tipo do bloco, ex.: heading, choice, button, loader, result"),
      props: BlockProps,
      index: z.number().int().min(0).optional().describe("Posição na tela; omitido, entra no fim"),
      id: SlugId.optional().describe("Id sugerido; se colidir, ganha sufixo automaticamente"),
    })
    .strict(),

  update_block: z
    .object({
      blockId: SlugId,
      props: BlockProps.describe("Apenas as props que mudam — são mescladas nas atuais"),
    })
    .strict(),

  remove_block: z.object({ blockId: SlugId }).strict(),

  move_block: z
    .object({
      blockId: SlugId,
      toStepId: SlugId,
      toIndex: z.number().int().min(0),
    })
    .strict(),

  set_step_logic: z
    .object({
      stepId: SlugId.describe("Tela de onde a regra parte"),
      rules: z
        .array(
          z.object({
            id: SlugId,
            goto: SlugId.describe("Tela de destino quando a condição bate"),
            when: AiCondition,
          }),
        )
        .describe("Avaliadas em ordem; a primeira que bate vence. Lista vazia remove as regras."),
    })
    .strict(),

  set_theme: z
    .object({
      bg: z.string().optional().describe("Cor de fundo em hexadecimal"),
      surface: z.string().optional().describe("Fundo de cards e opções"),
      text: z.string().optional(),
      muted: z.string().optional(),
      primary: z.string().optional().describe("Cor da marca"),
      primaryFg: z.string().optional().describe("Texto sobre a cor primária"),
      accent: z.string().optional(),
      border: z.string().optional(),
      headingFont: z.string().optional().describe("Família da fonte dos títulos, ex.: Poppins"),
      bodyFont: z.string().optional(),
      buttonVariant: z.enum(["solid", "outline", "soft", "ghost"]).optional(),
      buttonRadius: z.enum(["none", "sm", "md", "lg", "xl", "full"]).optional(),
      contentWidth: z.number().min(280).max(1400).optional(),
    })
    .strict(),
} as const;

export type AiToolName = keyof typeof aiToolSchemas;

export const aiToolDescriptions: Record<AiToolName, string> = {
  add_step: "Cria uma tela nova no funil.",
  update_step: "Altera nome, tipo ou layout de uma tela existente.",
  remove_step: "Remove uma tela. As regras que apontavam para ela são limpas.",
  add_block: "Adiciona um bloco a uma tela. Mande o objeto props completo do tipo escolhido.",
  update_block: "Altera props de um bloco existente. Mande só o que muda.",
  remove_block: "Remove um bloco.",
  move_block: "Move um bloco para outra posição ou outra tela.",
  set_step_logic:
    "Define para onde o visitante vai ao sair de uma tela, conforme respostas ou pontuação.",
  set_theme: "Ajusta cores, fontes e estilo de botão do funil inteiro.",
};

export const AI_TOOL_NAMES = Object.keys(aiToolSchemas) as AiToolName[];
