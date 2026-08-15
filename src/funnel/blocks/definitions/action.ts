import { z } from "zod";

import { BlockAction, Condition, MediaImage, SlugId } from "../../schema/common";
import { defineBlock } from "../types";

export const buttonBlock = defineBlock({
  type: "button",
  label: "Botão / CTA",
  category: "acao",
  icon: "MousePointerClick",
  description:
    "Botão de chamada para ação. Em telas com pergunta de escolha única e autoAdvance ligado ele é desnecessário; use nas telas de conteúdo, de formulário e na oferta final. O rótulo deve dizer o benefício ('Ver meu plano'), não a mecânica ('Enviar').",
  props: z
    .object({
      label: z.string().min(1).describe("Aceita interpolação: 'Continuar, {{nome}}'"),
      subLabel: z.string().optional().describe("Linha menor dentro do botão, ex.: 'leva 30 segundos'"),
      action: BlockAction,
      variant: z.enum(["solid", "outline", "soft", "ghost"]).optional().describe("Omitido = usa o padrão do tema"),
      size: z.enum(["sm", "md", "lg"]).optional(),
      fullWidth: z.boolean().optional(),
      icon: z.string().optional().describe("Nome de ícone lucide-react, ex.: 'ArrowRight'"),
    })
    .strict(),
  defaults: {
    label: "Continuar",
    action: { kind: "next" },
  },
  example: {
    label: "Ver meu plano personalizado",
    subLabel: "leva menos de 1 minuto",
    action: { kind: "next" },
    icon: "ArrowRight",
  },
});

export const loaderBlock = defineBlock({
  type: "loader",
  label: "Carregando / Personalizando",
  category: "acao",
  icon: "Loader",
  description:
    "A tela de 'Personalizando seu plano': progresso animado percorrendo etapas de texto, como se algo estivesse sendo calculado. É um dos padrões de maior conversão em funis (usado por Noom, BetterMe e similares) porque dá peso ao resultado que vem em seguida. Coloque logo antes do step de resultado. Ao terminar, executa a ação configurada — normalmente avançar. Três visuais em 'layout': 'anel' (padrão, anel de progresso com a lista de etapas ao lado — o mais 'técnico'), 'barra' (barra horizontal com a lista abaixo — mais linear, bom quando há bastante etapa), 'pulso' (ícone pulsando com uma etapa grande por vez, sem lista — o mais leve e 'humano', bom pra funil curto).",
  props: z
    .object({
      layout: z
        .enum(["anel", "barra", "pulso"])
        .optional()
        .describe(
          "Visual do carregamento; omitido usa 'anel'. Varie entre telas de loader do mesmo funil se houver mais de uma.",
        ),
      title: z.string().describe("Título fixo acima do progresso. Aceita interpolação."),
      subtitle: z.string().optional(),
      steps: z
        .array(
          z
            .object({
              label: z.string().min(1).describe("Ex.: 'Analisando suas respostas...'"),
              durationMs: z.number().min(200).max(15000).describe("Quanto tempo esta etapa fica na tela"),
            })
            .strict(),
        )
        .min(1)
        .max(8)
        .describe("Etapas exibidas em sequência. Some entre 3 e 6 segundos no total: mais que isso cansa."),
      showPercent: z.boolean(),
      onFinish: BlockAction.describe("Executado quando a última etapa termina"),
    })
    .strict(),
  defaults: {
    layout: "anel",
    title: "Personalizando seu plano...",
    steps: [
      { label: "Analisando suas respostas", durationMs: 1400 },
      { label: "Calculando seu perfil", durationMs: 1400 },
      { label: "Montando seu plano", durationMs: 1600 },
    ],
    showPercent: true,
    onFinish: { kind: "next" },
  },
  example: {
    layout: "anel",
    title: "Estamos montando seu plano, {{nome}}",
    subtitle: "Isso leva só alguns segundos",
    steps: [
      { label: "Analisando suas respostas", durationMs: 1200 },
      { label: "Comparando com mais de 40 mil perfis", durationMs: 1600 },
      { label: "Ajustando as recomendações", durationMs: 1400 },
    ],
    showPercent: true,
    onFinish: { kind: "next" },
  },
});

const Outcome = z
  .object({
    id: SlugId,
    when: Condition.optional().describe(
      "Condição para este resultado ser o escolhido. Os resultados são testados na ordem e o primeiro que casar vence. O último da lista deve ficar sem condição, servindo de padrão.",
    ),
    title: z.string().min(1),
    description: z.string().optional().describe("Aceita **negrito**, quebras de linha e {{interpolação}}"),
    badge: z.string().optional().describe("Etiqueta curta acima do título, ex.: 'Seu perfil'"),
    image: MediaImage.optional(),
  })
  .strict();

export const resultBlock = defineBlock({
  type: "result",
  label: "Resultado",
  category: "acao",
  icon: "Sparkles",
  description:
    "Mostra um diagnóstico diferente conforme as respostas ou a pontuação. Cada resultado tem sua condição; o primeiro que casar é exibido. Deixe sempre um resultado final sem condição como padrão, para nunca cair em tela vazia.",
  props: z
    .object({
      outcomes: z.array(Outcome).min(1).max(10),
    })
    .strict(),
  defaults: {
    outcomes: [{ id: "padrao", title: "Seu resultado", description: "Descrição do resultado." }],
  },
  example: {
    outcomes: [
      {
        id: "metabolismo_lento",
        when: { kind: "leaf", ref: { source: "score", key: "metabolismo_lento" }, op: "gte", value: 6 },
        badge: "Seu perfil",
        title: "Metabolismo lento",
        description: "Seu corpo tende a **estocar energia**. O plano foca em destravar seu gasto calórico.",
      },
      {
        id: "padrao",
        badge: "Seu perfil",
        title: "Metabolismo equilibrado",
        description: "Seu foco deve ser consistência, não restrição.",
      },
    ],
  },
});
