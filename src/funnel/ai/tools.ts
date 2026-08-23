import { z } from "zod";

import { SlugId, VariableKey } from "../schema/common";
import { FunnelVariable } from "../schema/funnel";

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

/** Um bloco a criar, no mesmo formato usado por `add_block` — reaproveitado em lote por `add_step` e `add_blocks`. */
const BlockEmLote = z
  .object({
    type: z.string().describe("Tipo do bloco, ex.: heading, choice, button, loader, result"),
    props: BlockProps,
    id: SlugId.optional().describe("Id sugerido; se colidir, ganha sufixo automaticamente"),
  })
  .strict();

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
      id: SlugId.optional().describe(
        "Id explícito da tela. Se você vai referenciá-la por id em next, goto, rules ou branch_by_answer, informe aqui — sem isso o id sai do nome inteiro (ex.: 'Seu produto hoje' vira 'step_seu_produto_hoje', não 'step_produto'), e a referência quebra. Se colidir com um id existente, ganha sufixo automático.",
      ),
      blocks: z
        .array(BlockEmLote)
        .optional()
        .describe(
          "Todos os blocos desta tela, na ordem em que entram. Prefira sempre preencher isto em vez de chamar add_block várias vezes depois — cria a tela inteira numa única chamada.",
        ),
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
      next: SlugId.optional().describe(
        "Destino fixo ao sair, no lugar da próxima tela da lista. Use só quando o destino não é a próxima tela da lista — convergência no fim de um branch, por exemplo. Omitido, a tela já segue a ordem natural; não chame esta ferramenta só para apontar para o que já viria em seguida.",
      ),
    })
    .strict(),

  remove_step: z.object({ stepId: SlugId }).strict(),

  move_step: z
    .object({
      stepId: SlugId,
      afterStepId: SlugId.nullable().describe(
        "Move para logo depois desta tela. Passe null para levar ao começo do funil.",
      ),
    })
    .strict(),

  add_block: z
    .object({
      stepId: SlugId.describe("Tela que recebe o bloco"),
      type: z.string().describe("Tipo do bloco, ex.: heading, choice, button, loader, result"),
      props: BlockProps,
      index: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe(
          "Posição na tela; omitido, entra no fim. Notou que faltou um bloco numa tela que já montou? Insira aqui, na posição certa — não remova e recrie os blocos ao redor.",
        ),
      id: SlugId.optional().describe("Id sugerido; se colidir, ganha sufixo automaticamente"),
    })
    .strict(),

  add_blocks: z
    .object({
      stepId: SlugId.describe("Tela que recebe os blocos"),
      blocks: z
        .array(BlockEmLote)
        .min(1)
        .describe("Blocos a acrescentar, na ordem em que entram."),
      index: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("Posição do primeiro bloco novo; os demais seguem em sequência. Omitido, todos entram no fim."),
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
      toIndex: z
        .number()
        .int()
        .min(0)
        .describe("Nova posição. Use para reordenar um bloco fora de lugar — não remova e recrie."),
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

  branch_by_answer: z
    .object({
      stepId: SlugId.describe("Tela que contém a pergunta"),
      blockId: SlugId.optional().describe("Bloco de escolha; omitido, usa o primeiro da tela"),
      branches: z
        .array(
          z.object({
            optionId: VariableKey.describe("Id da opção, exatamente como está no bloco"),
            goto: SlugId.describe("Tela para onde essa resposta leva"),
          }),
        )
        .min(2)
        .describe("Um destino por opção. As telas de destino já precisam existir."),
      replace: z
        .boolean()
        .optional()
        .describe("Substitui as regras existentes em vez de acrescentar. Padrão: acrescenta."),
    })
    .strict(),

  set_block_visibility: z
    .object({
      blockId: SlugId,
      when: AiCondition.nullable().describe(
        "Condição para o bloco aparecer. Passe null para o bloco voltar a aparecer sempre.",
      ),
    })
    .strict(),

  check_funnel: z
    .object({})
    .strict()
    .describe("Sem parâmetros"),

  ask_user: z
    .object({
      question: z.string().min(1).describe("Pergunta curta e direta, em português"),
      options: z
        .array(z.string().min(1))
        .min(2)
        .max(4)
        .describe("Respostas rápidas para a pessoa tocar. Devem cobrir os casos mais prováveis."),
      allowFreeText: z
        .boolean()
        .optional()
        .describe("Permite responder digitando em vez de escolher. Padrão: permite."),
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

  /**
   * Só liberada no modo cuidadoso (`thorough`) — ver `route.ts`. Estruturada,
   * não texto solto: é o que permite validar a riqueza do plano (sobretudo da
   * oferta final) antes de gastar qualquer chamada de construção.
   */
  submit_plan: z
    .object({
      screens: z
        .array(
          z.object({
            name: z.string().min(1).describe("Nome da tela"),
            type: z.enum(["question", "content", "loading", "result", "form", "checkout"]),
            purpose: z.string().min(1).describe("O que esta tela faz e por quê, uma frase"),
            blocks: z
              .array(z.string())
              .min(1)
              .describe("Tipos de bloco desta tela, na ordem em que vão entrar, ex.: ['progress','heading','choice']"),
            personalization: z
              .string()
              .optional()
              .describe("O que muda nesta tela conforme respostas anteriores, se houver"),
          }),
        )
        .min(1)
        .describe(
          "Apenas as telas que este pedido cria ou muda de forma relevante — não redescreva telas existentes que não mudam.",
        ),
      scoring: z
        .string()
        .describe("Quais perguntas pontuam, para quais categorias, e o que cada uma decide no fim. Se nenhuma pontuar, diga isso."),
      personalizationSummary: z
        .string()
        .min(1)
        .describe("Resumo de como as respostas mudam o que a pessoa vê ao longo do funil"),
      variablesPlan: z
        .string()
        .optional()
        .describe("Variáveis de URL/UTM usadas, se houver, e o que elas personalizam"),
    })
    .strict(),

  set_variables: z
    .object({
      variables: z
        .array(FunnelVariable)
        .max(10)
        .describe("Substitui as variáveis com a mesma key; acrescenta as novas. Não apaga as demais."),
    })
    .strict(),
} as const;

export type AiToolName = keyof typeof aiToolSchemas;

export const aiToolDescriptions: Record<AiToolName, string> = {
  add_step:
    "Cria uma tela nova no funil. Prefira preencher blocks com todos os blocos dela nesta mesma chamada, em vez de chamar add_block várias vezes depois.",
  update_step: "Altera nome, tipo ou layout de uma tela existente.",
  remove_step: "Remove uma tela. As regras que apontavam para ela são limpas.",
  move_step:
    "Muda a posição de uma tela na sequência. É como se conserta uma tela que ficou depois do fim do funil e por isso não é alcançada.",
  add_block:
    "Adiciona um bloco avulso a uma tela. Mande o objeto props completo do tipo escolhido. Para vários blocos de uma vez, use blocks em add_step (tela nova) ou add_blocks (tela existente) — mais barato que várias chamadas.",
  add_blocks:
    "Acrescenta vários blocos de uma vez a uma tela que já existe — por exemplo ao encorpar a tela de oferta com pricing + guarantee + prova social juntos. Prefira esta ferramenta a várias chamadas de add_block em sequência.",
  update_block: "Altera props de um bloco existente. Mande só o que muda.",
  remove_block: "Remove um bloco.",
  move_block: "Move um bloco para outra posição ou outra tela.",
  set_step_logic:
    "Define para onde o visitante vai ao sair de uma tela, conforme respostas ou pontuação.",
  branch_by_answer:
    "Cria de uma vez um caminho por opção de uma pergunta. É a forma correta de ramificar: prefira esta ferramenta a montar as condições uma a uma.",
  set_block_visibility:
    "Faz um bloco aparecer só quando uma condição é verdadeira. É como se personaliza o conteúdo dentro de uma tela — dois CTAs diferentes, um texto que só quem respondeu X vê — sem precisar duplicar a tela inteira.",
  check_funnel:
    "Confere o funil e devolve os problemas encontrados: telas inalcançáveis, regras quebradas, perguntas demais em sequência, falta de captura. Chame ao terminar de montar.",
  ask_user:
    "Faz uma pergunta ao usuário e espera a resposta. Use no máximo uma vez por pedido, e só quando a resposta mudaria o funil de verdade.",
  set_theme: "Ajusta cores, fontes e estilo de botão do funil inteiro.",
  submit_plan:
    "Envia o plano estruturado do funil antes de construir. No modo cuidadoso, nenhuma outra ferramenta de edição libera até este plano ser aceito — chame como ferramenta, não descreva o plano em texto solto. Se vier rejeitado, corrija e reenvie.",
  set_variables:
    "Declara ou atualiza variáveis de personalização por URL (UTM, parâmetros de campanha) ou constantes. Referencie com {{chave}} em qualquer texto do funil.",
};

/**
 * Ferramentas que o servidor NÃO executa.
 *
 * `ask_user` para o stream e devolve o controle ao cliente, que mostra o popup
 * e responde por `addToolResult` — é o padrão de human-in-the-loop do AI SDK.
 */
export const CLIENT_SIDE_TOOLS: AiToolName[] = ["ask_user"];

export const AI_TOOL_NAMES = Object.keys(aiToolSchemas) as AiToolName[];
