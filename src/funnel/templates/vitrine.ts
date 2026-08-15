import type { FunnelDocument } from "../schema";
import { defaultTheme } from "../schema/theme";

/**
 * Vitrine de blocos.
 *
 * Existe para dois usos práticos: conferir de uma vez só como cada bloco fica
 * renderizado de verdade (é assim que os problemas de layout aparecem) e servir
 * de referência viva de quais props produzem qual resultado.
 *
 * Não é modelo de funil — as telas aqui agrupam blocos por tipo, o que nenhum
 * funil de verdade deveria fazer.
 */
export const vitrineTemplate: FunnelDocument = {
  schemaVersion: 1,
  name: "Vitrine de blocos",
  slug: "vitrine",
  locale: "pt-BR",
  theme: defaultTheme,
  settings: {
    seo: { title: "Vitrine de blocos", noindex: true },
    pixels: {},
    showBranding: false,
  },
  variables: [],
  steps: [
    {
      id: "step_prova",
      name: "Prova social",
      type: "content",
      layout: { align: "center", fullHeight: false },
      logic: { rules: [] },
      blocks: [
        { id: "blk_t1", type: "heading", props: { text: "Prova social", level: 2 } },
        {
          id: "blk_alerta",
          type: "alert",
          props: {
            variant: "atencao",
            title: "Atenção",
            text: "Seu perfil indica **risco alto** de recuperar o peso nos próximos 6 meses.",
          },
        },
        {
          id: "blk_cards",
          type: "cards",
          props: {
            columns: { base: 1, md: 3 },
            items: [
              { emoji: "🥗", title: "Plano sob medida", description: "Montado das suas respostas" },
              { emoji: "📱", title: "Tudo no celular", description: "Sem planilha, sem papel" },
              { emoji: "🤝", title: "Acompanhamento", description: "Ajustes toda semana" },
            ],
          },
        },
        {
          id: "blk_depoimentos",
          type: "testimonials",
          props: {
            layout: "stack",
            showRating: true,
            items: [
              {
                name: "Marina Alves",
                handle: "@marina.alves",
                text: "Em 3 semanas parei de sentir a queda de energia depois do almoço.",
                rating: 5,
              },
              {
                name: "Rafael Dias",
                handle: "@rafa.dias",
                text: "Já tinha tentado de tudo. A diferença foi caber na minha rotina.",
                rating: 5,
              },
            ],
          },
        },
        {
          id: "blk_marquise",
          type: "marquee",
          props: {
            speed: 30,
            direction: "esquerda",
            pauseOnHover: true,
            items: [
              { name: "Jill", text: "Estou sem palavras." },
              { name: "John", text: "Melhor decisão do ano." },
              { name: "Jenny", text: "Funcionou na primeira semana." },
              { name: "Ana", text: "Recomendo demais." },
            ],
          },
        },
        {
          id: "blk_lista_notif",
          type: "list",
          props: {
            variant: "notificacao",
            marker: "none",
            animated: true,
            stagger: 400,
            items: [
              { emoji: "🎉", title: "Novo pedido", description: "há 2 minutos" },
              { emoji: "💬", title: "Nova mensagem", description: "há 5 minutos" },
              { emoji: "✅", title: "Usuário se cadastrou", description: "há 8 minutos" },
            ],
          },
        },
        { id: "blk_btn1", type: "button", props: { label: "Ver dados", action: { kind: "next" } } },
      ],
    },

    {
      id: "step_dados",
      name: "Dados",
      type: "content",
      layout: { align: "center", fullHeight: false },
      logic: { rules: [] },
      blocks: [
        { id: "blk_t2", type: "heading", props: { text: "Visualização de dados", level: 2 } },
        {
          id: "blk_grafico",
          type: "chart",
          props: {
            title: "Seu gasto calórico comparado",
            orientation: "horizontal",
            max: 100,
            unit: "%",
            bars: [
              { label: "Você hoje", value: 35, highlight: true },
              { label: "Média do seu perfil", value: 60 },
              { label: "Onde dá para chegar", value: 85 },
            ],
          },
        },
        {
          id: "blk_curva",
          type: "cartesian",
          props: {
            title: "Sua projeção de energia",
            youIndex: 0,
            youLabel: "Você está aqui",
            goalLabel: "Objetivo",
            showAxisLabels: true,
            points: [
              { label: "Hoje", value: 22 },
              { label: "2 sem", value: 40 },
              { label: "6 sem", value: 68 },
              { label: "12 sem", value: 92 },
            ],
          },
        },
        {
          id: "blk_nivel",
          type: "level",
          props: {
            title: "Seu nível de prontidão",
            value: 72,
            zones: ["Baixo", "Médio", "Alto"],
            markerLabel: "Você está aqui",
            showPercent: true,
          },
        },
        {
          id: "blk_comparar",
          type: "compare",
          props: {
            title: "Por que fazer acompanhado",
            columns: ["Com o plano", "Por conta própria"],
            highlightColumn: 0,
            rows: [
              { label: "Plano ajustado ao perfil", values: [true, false] },
              { label: "Ajuste quando travar", values: [true, false] },
              { label: "Tempo até resultado", values: ["3 semanas", "6 meses"] },
            ],
          },
        },
        { id: "blk_btn2", type: "button", props: { label: "Ver mídia", action: { kind: "next" } } },
      ],
    },

    {
      id: "step_midia",
      name: "Mídia e conteúdo",
      type: "content",
      layout: { align: "center", fullHeight: false },
      logic: { rules: [] },
      blocks: [
        { id: "blk_t3", type: "heading", props: { text: "Mídia e conteúdo", level: 2 } },
        {
          id: "blk_audio",
          type: "audio",
          props: {
            src: "https://cdn.jsdelivr.net/gh/anars/blank-audio/30-seconds-of-silence.mp3",
            senderName: "Dra. Ana",
            durationLabel: "0:30",
            autoplay: false,
          },
        },
        {
          id: "blk_carrossel",
          type: "carousel",
          props: {
            aspect: "4:3",
            autoplay: true,
            intervalMs: 3500,
            showDots: true,
            slides: [
              {
                image: {
                  url: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=70",
                  alt: "Prato equilibrado",
                },
                title: "Marina, 34",
                text: "8 semanas",
              },
              {
                image: {
                  url: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=70",
                  alt: "Treino",
                },
                title: "Rafael, 41",
                text: "12 semanas",
              },
            ],
          },
        },
        {
          id: "blk_faq",
          type: "faq",
          props: {
            allowMultipleOpen: false,
            items: [
              {
                question: "Preciso de equipamento?",
                answer: "Não. Todos os treinos são feitos em casa, sem nada além do seu peso.",
              },
              {
                question: "E se eu não gostar?",
                answer: "Você tem 7 dias para pedir reembolso, sem precisar justificar.",
              },
            ],
          },
        },
        { id: "blk_btn3", type: "button", props: { label: "Ver oferta", action: { kind: "next" } } },
      ],
    },

    {
      id: "step_oferta",
      name: "Oferta",
      type: "checkout",
      layout: { align: "center", fullHeight: false },
      logic: { rules: [], isEnd: true },
      blocks: [
        { id: "blk_confetti", type: "confetti", props: { intensity: "medio", durationMs: 2200 } },
        { id: "blk_t4", type: "heading", props: { text: "Oferta", level: 2 } },
        {
          id: "blk_countdown",
          type: "countdown",
          props: { mode: "duracao", minutes: 15, label: "Esta condição expira em" },
        },
        {
          id: "blk_preco",
          type: "pricing",
          props: {
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
            action: { kind: "submit" },
            actionLabel: "Quero meu plano",
            highlighted: true,
          },
        },
        {
          id: "blk_termos",
          type: "terms",
          props: {
            text: "Ao continuar, você concorda com os [Termos de uso](https://exemplo.com/termos) e a [Política de privacidade](https://exemplo.com/privacidade).",
          },
        },
      ],
    },
  ],
};
