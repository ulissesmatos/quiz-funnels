import { z } from "zod";

import { defineBlock } from "../types";

/**
 * Texto formatado aceito por `heading`, `text` e afins.
 * Suporta um markdown inline mínimo — **negrito**, *itálico*, [link](url) — e
 * interpolação `{{variavel}}`. É parseado no render, nunca injetado como HTML.
 */
const RichText = z
  .string()
  .describe(
    "Texto. Aceita **negrito**, *itálico*, [link](url), quebra de linha com \\n e interpolação de variáveis com {{nome}}",
  );

export const headingBlock = defineBlock({
  type: "heading",
  label: "Título",
  category: "conteudo",
  icon: "Heading1",
  description:
    "Título de destaque. Use nível 1 para a pergunta ou promessa principal do step (um por tela), nível 2 para subtítulos e nível 3 para rótulos de seção.",
  props: z
    .object({
      text: RichText,
      level: z
        .union([z.literal(1), z.literal(2), z.literal(3)])
        .describe("1 = maior. Cada step deve ter no máximo um nível 1."),
    })
    .strict(),
  defaults: { text: "Seu título aqui", level: 1 },
  example: { text: "Qual é o seu principal objetivo, {{nome}}?", level: 1 },
});

export const textBlock = defineBlock({
  type: "text",
  label: "Texto",
  category: "conteudo",
  icon: "Type",
  description:
    "Parágrafo de apoio. Bom para contextualizar a pergunta, reforçar benefício ou dar uma instrução curta. Mantenha enxuto: funis convertem melhor com pouco texto.",
  props: z.object({ text: RichText }).strict(),
  defaults: { text: "Escreva aqui um texto de apoio." },
  example: { text: "Leva menos de **2 minutos** e o resultado é personalizado." },
});

export const listBlock = defineBlock({
  type: "list",
  label: "Lista",
  category: "conteudo",
  icon: "ListChecks",
  description:
    "Lista de itens que podem aparecer um a um, em cascata. Muito usada para enumerar benefícios, o que a pessoa vai receber, ou etapas de um método.",
  props: z
    .object({
      items: z
        .array(
          z
            .object({
              title: RichText,
              description: RichText.optional(),
              emoji: z.string().max(8).optional().describe("Emoji usado como marcador quando marker = 'emoji'"),
            })
            .strict(),
        )
        .min(1)
        .max(20),
      // Opcional de propósito: o campo nasceu depois que já havia funil salvo
      // no banco, e exigi-lo invalidaria documentos que estão no ar.
      variant: z
        .enum(["simples", "notificacao"])
        .optional()
        .describe(
          "simples = lista de benefícios; notificacao = cada item vira um card com ícone colorido, no formato de um feed de avisos ('Novo pedido', 'Usuário se cadastrou'), bom para simular movimento e prova social",
        ),
      marker: z
        .enum(["check", "number", "emoji", "dot", "none"])
        .describe("Formato do marcador de cada item. Ignorado quando variant = 'notificacao'."),
      animated: z.boolean().describe("Revela os itens em cascata ao entrar na tela"),
      stagger: z.number().min(0).max(2000).describe("Intervalo em ms entre um item e o próximo quando animated = true"),
    })
    .strict(),
  defaults: {
    items: [{ title: "Primeiro benefício" }, { title: "Segundo benefício" }, { title: "Terceiro benefício" }],
    marker: "check",
    animated: true,
    stagger: 150,
  },
  example: {
    items: [
      { title: "Plano alimentar sob medida", description: "Feito a partir das suas respostas" },
      { title: "Acompanhamento semanal" },
      { title: "Cancelamento a qualquer momento" },
    ],
    marker: "check",
    animated: true,
    stagger: 150,
  },
});

export const dividerBlock = defineBlock({
  type: "divider",
  label: "Divisor",
  category: "layout",
  icon: "Minus",
  description: "Linha horizontal para separar seções visualmente.",
  props: z
    .object({
      lineStyle: z.enum(["solid", "dashed", "dotted"]),
      thickness: z.number().min(1).max(8),
    })
    .strict(),
  defaults: { lineStyle: "solid", thickness: 1 },
  example: { lineStyle: "solid", thickness: 1 },
});

export const spacerBlock = defineBlock({
  type: "spacer",
  label: "Espaço",
  category: "layout",
  icon: "MoveVertical",
  description:
    "Espaço vertical vazio. Prefira ajustar as margens dos blocos; use este bloco só quando precisar de um respiro grande, como empurrar o CTA para o fim da tela.",
  props: z.object({ size: z.number().min(4).max(400).describe("Altura em pixels") }).strict(),
  defaults: { size: 24 },
  example: { size: 32 },
});

export const progressBlock = defineBlock({
  type: "progress",
  label: "Barra de progresso",
  category: "layout",
  icon: "LoaderPinwheel",
  description:
    "Barra que mostra o avanço no funil. No modo 'auto' ela se calcula sozinha pela posição do step atual — é o modo recomendado. Colocar no topo de cada pergunta aumenta bastante a taxa de conclusão.",
  props: z
    .object({
      mode: z
        .enum(["auto", "manual"])
        .describe("auto = calculado pela posição do step; manual = usa o campo value"),
      value: z.number().min(0).max(100).optional().describe("Percentual, usado apenas quando mode = 'manual'"),
      showLabel: z.boolean(),
      label: z
        .string()
        .optional()
        .describe("Rótulo acima da barra. Aceita {{progresso}} e {{passo}}. Ex.: 'Etapa {{passo}} de {{total}}'"),
      sticky: z
        .boolean()
        .optional()
        .describe(
          "Fixa a barra no topo da tela em vez de deixá-la seguir o fluxo. Recomendado em telas de pergunta, que são centralizadas verticalmente.",
        ),
    })
    .strict(),
  defaults: { mode: "auto", showLabel: false, sticky: true },
  example: { mode: "auto", showLabel: true, label: "{{progresso}}% concluído", sticky: true },
});
