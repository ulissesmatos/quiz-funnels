import { z } from "zod";

import { VariableKey } from "../../schema/common";
import { defineBlock } from "../types";

/**
 * Blocos de visualização de dados.
 *
 * Uma restrição molda os três: **as cores vêm do tema do cliente**, escolhidas
 * em tempo de execução. Não dá para validar uma paleta categórica que ainda não
 * existe. Por isso nenhum deles usa várias cores para diferenciar séries — todos
 * usam **um só matiz em dois níveis de ênfase**, que é uma rampa sequencial e
 * portanto legível para daltonismo por construção, com qualquer cor que o
 * usuário escolher. A identidade de cada marca vem do rótulo ao lado dela, nunca
 * só da cor.
 */

export const chartBlock = defineBlock({
  type: "chart",
  label: "Gráfico de barras",
  category: "dados",
  icon: "ChartColumn",
  description:
    "Barras comparativas com o valor escrito em cada uma. O uso que converte é comparar a pessoa com uma referência — 'seu resultado' contra 'a média' contra 'a meta'. Marque com highlight a barra que representa quem está respondendo. Use de 2 a 5 barras: mais que isso vira tabela.",
  props: z
    .object({
      title: z.string().optional(),
      bars: z
        .array(
          z
            .object({
              label: z.string().min(1),
              value: z.number().describe("Valor numérico usado para o tamanho da barra"),
              valueLabel: z
                .string()
                .optional()
                .describe("Texto exibido no lugar do número, ex.: '2,5 kg'. Omitido, mostra o valor + unidade."),
              highlight: z
                .boolean()
                .optional()
                .describe("Destaca esta barra — use na que representa o visitante"),
            })
            .strict(),
        )
        .min(2)
        .max(6),
      orientation: z
        .enum(["horizontal", "vertical"])
        .describe(
          "horizontal é o padrão porque rótulo em português não cabe embaixo de barra vertical em tela de celular",
        ),
      max: z.number().optional().describe("Topo da escala; omitido, usa o maior valor"),
      unit: z.string().optional().describe("Sufixo do valor, ex.: '%' ou 'kg'"),
    })
    .strict(),
  defaults: {
    bars: [
      { label: "Você", value: 35, highlight: true },
      { label: "Média", value: 60 },
    ],
    orientation: "horizontal",
    unit: "%",
  },
  example: {
    title: "Seu gasto calórico comparado",
    bars: [
      { label: "Você hoje", value: 35, highlight: true },
      { label: "Média do seu perfil", value: 60 },
      { label: "Onde dá para chegar", value: 85 },
    ],
    orientation: "horizontal",
    max: 100,
    unit: "%",
  },
});

export const cartesianBlock = defineBlock({
  type: "cartesian",
  label: "Curva de progresso",
  category: "dados",
  icon: "TrendingUp",
  description:
    "Curva que mostra uma trajetória ao longo do tempo, com um marcador de onde a pessoa está e outro de onde ela pode chegar. É a projeção visual do 'antes e depois' — muito forte logo depois do diagnóstico, antes da oferta. Use rótulos de tempo no eixo (ex.: hoje, 4 semanas, 12 semanas).",
  props: z
    .object({
      title: z.string().optional(),
      points: z
        .array(z.object({ label: z.string().min(1), value: z.number() }).strict())
        .min(2)
        .max(8)
        .describe("Na ordem do eixo, da esquerda para a direita"),
      youIndex: z.number().int().min(0).describe("Índice do ponto marcado como 'onde você está'"),
      youLabel: z.string().describe("Rótulo do marcador da pessoa"),
      goalLabel: z.string().optional().describe("Rótulo do último ponto; omitido, não marca o alvo"),
      showAxisLabels: z.boolean(),
    })
    .strict(),
  defaults: {
    points: [
      { label: "Hoje", value: 20 },
      { label: "4 semanas", value: 55 },
      { label: "12 semanas", value: 90 },
    ],
    youIndex: 0,
    youLabel: "Você",
    goalLabel: "Objetivo",
    showAxisLabels: true,
  },
  example: {
    title: "Sua projeção de energia",
    points: [
      { label: "Hoje", value: 22 },
      { label: "2 semanas", value: 40 },
      { label: "6 semanas", value: 68 },
      { label: "12 semanas", value: 92 },
    ],
    youIndex: 0,
    youLabel: "Você está aqui",
    goalLabel: "Objetivo",
    showAxisLabels: true,
  },
});

export const levelBlock = defineBlock({
  type: "level",
  label: "Nível",
  category: "dados",
  icon: "Gauge",
  description:
    "Escala com faixas nomeadas e um marcador de 'você está aqui'. Serve para devolver um diagnóstico em uma imagem só: nível de prontidão, de risco, de urgência. Com scoreKey preenchido, a posição vem da pontuação real do quiz e muda conforme as respostas — é assim que fica personalizado de verdade.",
  props: z
    .object({
      title: z.string().optional(),
      value: z.number().min(0).max(100).describe("Posição de 0 a 100. Ignorado quando scoreKey está preenchido."),
      scoreKey: VariableKey.optional().describe(
        "Categoria de pontuação que define a posição, ex.: 'metabolismo_lento'. Deixe vazio para posição fixa.",
      ),
      scoreMax: z
        .number()
        .min(1)
        .optional()
        .describe("Pontuação que equivale a 100%. Obrigatório junto com scoreKey."),
      zones: z
        .array(z.string().min(1))
        .min(2)
        .max(5)
        .describe("Faixas da escala, da esquerda para a direita, ex.: ['Baixo','Médio','Alto']"),
      markerLabel: z.string().describe("Texto do balão sobre o marcador"),
      showPercent: z.boolean(),
    })
    .strict(),
  defaults: {
    value: 50,
    zones: ["Baixo", "Médio", "Alto"],
    markerLabel: "Você está aqui",
    showPercent: true,
  },
  example: {
    title: "Seu nível de prontidão",
    value: 75,
    scoreKey: "prontidao",
    scoreMax: 12,
    zones: ["Baixo", "Médio", "Alto"],
    markerLabel: "Você está aqui",
    showPercent: true,
  },
});

export const compareBlock = defineBlock({
  type: "compare",
  label: "Comparar",
  category: "dados",
  icon: "Columns3",
  description:
    "Tabela de comparação com ✓ e ✗. O uso clássico é 'com o método' contra 'por conta própria', ou você contra a alternativa que a pessoa já tentou. Cada linha deve ser um benefício concreto, não um adjetivo. Destaque a coluna que você quer que ela escolha.",
  props: z
    .object({
      title: z.string().optional(),
      columns: z
        .array(z.string().min(1))
        .min(2)
        .max(3)
        .describe("Cabeçalhos das colunas de comparação, ex.: ['Com o plano','Sozinho']"),
      highlightColumn: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("Índice da coluna em destaque; normalmente a 0"),
      rows: z
        .array(
          z
            .object({
              label: z.string().min(1).describe("O que está sendo comparado"),
              values: z
                .array(z.union([z.boolean(), z.string()]))
                .describe(
                  "Um item por coluna, na mesma ordem. true vira ✓, false vira ✗, e texto aparece como está.",
                ),
            })
            .strict(),
        )
        .min(1)
        .max(12),
    })
    .strict(),
  defaults: {
    columns: ["Com o plano", "Sozinho"],
    highlightColumn: 0,
    rows: [
      { label: "Primeiro benefício", values: [true, false] },
      { label: "Segundo benefício", values: [true, false] },
    ],
  },
  example: {
    title: "Por que fazer acompanhado",
    columns: ["Com o plano", "Por conta própria"],
    highlightColumn: 0,
    rows: [
      { label: "Plano ajustado ao seu perfil", values: [true, false] },
      { label: "Ajuste quando travar", values: [true, false] },
      { label: "Tempo até o primeiro resultado", values: ["3 semanas", "6 meses"] },
      { label: "Custo", values: ["R$ 39,90", "tentativa e erro"] },
    ],
  },
});
