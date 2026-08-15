import { z } from "zod";

import { BlockAction } from "../../schema/common";
import { defineBlock } from "../types";

/** Blocos de fechamento: oferta, urgência e celebração. */

export const pricingBlock = defineBlock({
  type: "pricing",
  label: "Preço",
  category: "acao",
  icon: "BadgeDollarSign",
  description:
    "Card de oferta com selo, preço, valor riscado, parcelamento e lista de benefícios. Use na tela final, depois do diagnóstico — nunca antes de a pessoa entender o que está comprando.",
  props: z
    .object({
      badge: z.string().optional().describe("Selo acima do card, ex.: 'Mais popular'"),
      title: z.string().min(1),
      description: z.string().optional(),
      price: z.string().min(1).describe("Preço já formatado, ex.: 'R$ 39,90'"),
      oldPrice: z.string().optional().describe("Valor riscado ao lado, ex.: 'R$ 97,00'"),
      discountLabel: z.string().optional().describe("Ex.: '15% off'"),
      priceNote: z.string().optional().describe("Linha pequena abaixo do preço, ex.: 'à vista' ou 'por mês'"),
      installments: z.string().optional().describe("Ex.: 'ou 12x de R$ 3,99'"),
      features: z.array(z.string()).max(12).describe("Itens inclusos, cada um com seu ✓"),
      action: BlockAction,
      actionLabel: z.string().min(1).describe("Texto do botão dentro do card"),
      highlighted: z.boolean().describe("Destaca o card com a cor primária"),
    })
    .strict(),
  defaults: {
    title: "Plano completo",
    price: "R$ 39,90",
    features: ["Primeiro benefício", "Segundo benefício"],
    action: { kind: "next" },
    actionLabel: "Quero começar",
    highlighted: true,
  },
  example: {
    badge: "Mais popular",
    title: "Plano Premium",
    description: "Acompanhamento completo por 12 semanas",
    price: "R$ 39,90",
    oldPrice: "R$ 97,00",
    discountLabel: "59% off",
    priceNote: "à vista",
    installments: "ou 12x de R$ 3,99",
    features: [
      "Plano alimentar sob medida",
      "Treinos para a sua rotina",
      "Ajustes toda semana",
      "Garantia de 7 dias",
    ],
    action: { kind: "link", url: "https://exemplo.com/checkout", newTab: false },
    actionLabel: "Quero meu plano",
    highlighted: true,
  },
});

export const countdownBlock = defineBlock({
  type: "countdown",
  label: "Contagem regressiva",
  category: "acao",
  icon: "Timer",
  description:
    "Relógio regressivo. No modo 'duracao' ele começa a contar quando a pessoa chega na tela — é o uso honesto, para uma condição que realmente expira na sessão. No modo 'data' aponta para um prazo fixo. Não use urgência falsa: queima a confiança que o resto do funil construiu.",
  props: z
    .object({
      mode: z.enum(["duracao", "data"]),
      minutes: z.number().min(1).max(1440).optional().describe("Usado quando mode = 'duracao'"),
      endsAt: z.string().optional().describe("Data ISO 8601, usada quando mode = 'data'"),
      label: z.string().optional().describe("Texto acima do relógio"),
      expiredText: z.string().optional().describe("O que mostrar quando zerar"),
      onEnd: BlockAction.optional().describe("Ação disparada ao zerar; omitido, apenas troca o texto"),
    })
    .strict(),
  defaults: { mode: "duracao", minutes: 15, label: "Esta condição expira em" },
  example: {
    mode: "duracao",
    minutes: 15,
    label: "Sua condição especial expira em",
    expiredText: "Tempo esgotado",
  },
  emptyState: (props) =>
    props.mode === "data" && !props.endsAt ? "Defina a data em que a contagem termina" : null,
});

export const confettiBlock = defineBlock({
  type: "confetti",
  label: "Confetti",
  category: "acao",
  icon: "PartyPopper",
  description:
    "Dispara confete assim que a tela abre. Use uma única vez no funil inteiro, na tela de resultado ou de conclusão — repetido, vira ruído. É puramente decorativo e não ocupa espaço no layout.",
  props: z
    .object({
      intensity: z.enum(["sutil", "medio", "forte"]),
      durationMs: z.number().min(300).max(8000),
      colors: z
        .array(z.string())
        .max(6)
        .optional()
        .describe("Cores em hexadecimal; omitido usa a primária e o destaque do tema"),
    })
    .strict(),
  defaults: { intensity: "medio", durationMs: 2500 },
  example: { intensity: "forte", durationMs: 3000, colors: ["#5b8cff", "#31d6a0", "#ffffff"] },
  // Nunca desenha nada: o confete é disparado num canvas próprio, por cima.
  emptyState: (props) => `Dispara confete ${props.intensity} ao abrir a tela`,
});

export const embedBlock = defineBlock({
  type: "embed",
  label: "Script / Embed",
  category: "layout",
  icon: "Code",
  description:
    "HTML de terceiros: player de vídeo próprio, widget de avaliação, formulário externo. Roda isolado num iframe, então não enxerga a página do funil e não interfere no resto da tela.",
  props: z
    .object({
      html: z.string().describe("HTML completo do embed, incluindo os <script> que ele precisar"),
      height: z.number().min(40).max(2000).describe("Altura reservada em pixels"),
      scrolling: z.boolean().describe("Permite rolagem dentro do quadro"),
    })
    .strict(),
  defaults: { html: "", height: 320, scrolling: false },
  example: {
    html: '<div id="widget"></div>\n<script src="https://exemplo.com/widget.js"></script>',
    height: 420,
    scrolling: false,
  },
  emptyState: (props) => (props.html.trim() ? null : "Cole o HTML do embed"),
});
