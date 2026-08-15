import { z } from "zod";

import { MediaImage, responsive } from "../../schema/common";
import { defineBlock } from "../types";

/**
 * Blocos de prova social e argumentação — o repertório que segura o visitante
 * entre uma pergunta e outra. Um funil que é só pergunta atrás de pergunta
 * perde gente no meio; estes blocos existem para dar respiro sem quebrar o
 * ritmo.
 */

export const alertBlock = defineBlock({
  type: "alert",
  label: "Alerta",
  category: "conteudo",
  icon: "TriangleAlert",
  description:
    "Caixa colorida de destaque. Use para um aviso importante, uma garantia ou um dado que precisa saltar da tela. Um por tela no máximo — o efeito depende de ser exceção.",
  props: z
    .object({
      variant: z
        .enum(["info", "sucesso", "atencao", "erro"])
        .describe("Define a cor: info = neutra, sucesso = verde, atencao = âmbar, erro = vermelha"),
      title: z.string().optional(),
      text: z.string().describe("Aceita **negrito** e {{interpolação}}"),
      icon: z.string().optional().describe("Nome de ícone lucide-react; omitido usa o do variant"),
    })
    .strict(),
  defaults: { variant: "info", text: "Escreva aqui o aviso." },
  example: {
    variant: "atencao",
    title: "Atenção",
    text: "Seu perfil indica **risco alto** de recuperar o peso perdido nos próximos 6 meses.",
  },
});

export const cardsBlock = defineBlock({
  type: "cards",
  label: "Argumentos",
  category: "prova",
  icon: "LayoutGrid",
  description:
    "Cards com emoji, título e uma linha de apoio. Bom para enumerar os pilares de um método, o que a pessoa recebe, ou três razões para continuar. Mais visual que uma lista.",
  props: z
    .object({
      items: z
        .array(
          z
            .object({
              emoji: z.string().max(8).optional(),
              icon: z.string().optional().describe("Nome de ícone lucide-react, alternativa ao emoji"),
              title: z.string().min(1),
              description: z.string().optional(),
            })
            .strict(),
        )
        .min(1)
        .max(9),
      columns: responsive(z.union([z.literal(1), z.literal(2), z.literal(3)])).describe(
        "Use { base: 1, md: 3 } para empilhar no celular e alinhar no desktop",
      ),
    })
    .strict(),
  defaults: {
    items: [
      { emoji: "🎯", title: "Primeiro argumento", description: "Uma linha explicando." },
      { emoji: "⚡", title: "Segundo argumento", description: "Uma linha explicando." },
    ],
    columns: { base: 1, md: 2 },
  },
  example: {
    items: [
      { emoji: "🥗", title: "Plano sob medida", description: "Montado a partir das suas respostas" },
      { emoji: "📱", title: "Tudo no celular", description: "Sem planilha, sem papel" },
      { emoji: "🤝", title: "Acompanhamento real", description: "Ajustes toda semana" },
    ],
    columns: { base: 1, md: 3 },
  },
});

const Testimonial = z
  .object({
    name: z.string().min(1),
    handle: z.string().optional().describe("Arroba ou cargo, ex.: @marina ou 'cliente desde 2023'"),
    text: z.string().min(1),
    avatar: MediaImage.optional(),
    rating: z.number().min(0).max(5).optional().describe("Estrelas, de 0 a 5"),
  })
  .strict();

export const testimonialsBlock = defineBlock({
  type: "testimonials",
  label: "Depoimentos",
  category: "prova",
  icon: "Quote",
  description:
    "Depoimentos com avatar, nome e estrelas. Coloque logo antes de pedir dados ou antes da oferta — é onde a desconfiança aparece. Depoimento específico converte mais que elogio genérico.",
  props: z
    .object({
      items: z.array(Testimonial).min(1).max(12),
      layout: z.enum(["stack", "grid"]).describe("stack = um embaixo do outro; grid = duas colunas no desktop"),
      showRating: z.boolean(),
    })
    .strict(),
  defaults: {
    items: [{ name: "Marina", handle: "@marina", text: "Mudou completamente minha rotina.", rating: 5 }],
    layout: "stack",
    showRating: true,
  },
  example: {
    items: [
      {
        name: "Marina Alves",
        handle: "@marina.alves",
        text: "Em 3 semanas parei de sentir aquela queda de energia depois do almoço.",
        rating: 5,
      },
      {
        name: "Rafael Dias",
        handle: "@rafa.dias",
        text: "Já tinha tentado de tudo. A diferença foi ter um plano que cabia na minha rotina.",
        rating: 5,
      },
    ],
    layout: "stack",
    showRating: true,
  },
});

export const marqueeBlock = defineBlock({
  type: "marquee",
  label: "Marquise",
  category: "prova",
  icon: "Repeat",
  description:
    "Faixa que desliza sem parar na horizontal, em loop. Boa para desfilar muitos depoimentos curtos, logos de veículos ou números, ocupando pouca altura. Use texto curto: a faixa está sempre em movimento.",
  props: z
    .object({
      items: z
        .array(
          z
            .object({
              text: z.string().min(1),
              name: z.string().optional(),
              avatar: MediaImage.optional(),
            })
            .strict(),
        )
        .min(2)
        .max(20),
      speed: z.number().min(10).max(120).describe("Segundos para a faixa dar uma volta completa"),
      direction: z.enum(["esquerda", "direita"]),
      pauseOnHover: z.boolean(),
    })
    .strict(),
  defaults: {
    items: [{ text: "Isso é incrível." }, { text: "Estou sem palavras." }, { text: "Recomendo demais." }],
    speed: 40,
    direction: "esquerda",
    pauseOnHover: true,
  },
  example: {
    items: [
      { name: "Jill", text: "Não sei o que dizer. Estou sem palavras." },
      { name: "John", text: "Melhor decisão do ano." },
      { name: "Jenny", text: "Funcionou já na primeira semana." },
    ],
    speed: 40,
    direction: "esquerda",
    pauseOnHover: true,
  },
});

export const faqBlock = defineBlock({
  type: "faq",
  label: "FAQ",
  category: "conteudo",
  icon: "CircleHelp",
  description:
    "Perguntas frequentes em acordeão. Coloque na tela de oferta, respondendo as objeções reais — preço, tempo, garantia, 'funciona para o meu caso'. Cada item aberto ocupa espaço, então comece todos fechados.",
  props: z
    .object({
      items: z
        .array(z.object({ question: z.string().min(1), answer: z.string().min(1) }).strict())
        .min(1)
        .max(15),
      allowMultipleOpen: z.boolean().describe("Permite deixar várias respostas abertas ao mesmo tempo"),
    })
    .strict(),
  defaults: {
    items: [{ question: "Como funciona?", answer: "Explique aqui em uma ou duas frases." }],
    allowMultipleOpen: false,
  },
  example: {
    items: [
      { question: "Preciso de equipamento?", answer: "Não. Todos os treinos são feitos em casa, sem nada além do seu peso." },
      { question: "E se eu não gostar?", answer: "Você tem 7 dias para pedir reembolso, sem precisar justificar." },
    ],
    allowMultipleOpen: false,
  },
});

export const termsBlock = defineBlock({
  type: "terms",
  label: "Termos",
  category: "conteudo",
  icon: "Scale",
  description:
    "Texto legal pequeno com links. Use abaixo do botão que captura dados, para cumprir LGPD sem atrapalhar a leitura da tela.",
  props: z
    .object({
      text: z
        .string()
        .describe("Texto corrido. Use [rótulo](url) para os links das políticas."),
    })
    .strict(),
  defaults: {
    text: "Ao continuar, você concorda com os [Termos de uso](https://exemplo.com/termos) e a [Política de privacidade](https://exemplo.com/privacidade).",
  },
  example: {
    text: "Ao clicar, você concorda com os [Termos de uso](https://exemplo.com/termos), a [Política de privacidade](https://exemplo.com/privacidade) e a [Política de cookies](https://exemplo.com/cookies).",
  },
});
