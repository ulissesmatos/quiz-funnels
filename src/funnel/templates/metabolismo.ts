import type { FunnelDocument } from "../schema";
import { defaultTheme } from "../schema/theme";

/**
 * Funil de exemplo — quiz de diagnóstico com plano personalizado.
 *
 * Segue o padrão que domina os funis de maior conversão do mercado (Noom,
 * BetterMe e derivados):
 *   1. promessa curta com tempo estimado,
 *   2. uma pergunta por tela, com avanço automático,
 *   3. prova social no meio, quando o engajamento cai,
 *   4. captura de dados só depois de a pessoa já ter investido respostas,
 *   5. tela de "personalizando seu plano" para dar peso ao resultado,
 *   6. diagnóstico personalizado por pontuação,
 *   7. oferta.
 *
 * Serve como seed do ambiente local e como modelo no editor.
 */
export const metabolismoTemplate: FunnelDocument = {
  schemaVersion: 1,
  name: "Quiz do Metabolismo",
  slug: "metabolismo",
  locale: "pt-BR",
  theme: {
    ...defaultTheme,
    colors: {
      ...defaultTheme.colors,
      bg: "#0b1020",
      surface: "#161d33",
      primary: "#5b8cff",
      accent: "#31d6a0",
      border: "#26304d",
    },
  },
  settings: {
    seo: {
      title: "Descubra seu tipo de metabolismo em 2 minutos",
      description:
        "Responda 6 perguntas rápidas e receba um diagnóstico personalizado do seu metabolismo, com o plano certo para o seu perfil.",
    },
    pixels: {},
    showBranding: true,
  },
  variables: [
    { key: "utm_source", source: "query" },
    { key: "utm_campaign", source: "query" },
  ],
  steps: [
    // ── 1. Abertura ────────────────────────────────────────
    {
      id: "step_inicio",
      name: "Abertura",
      type: "content",
      layout: { align: "center", fullHeight: true },
      logic: { rules: [] },
      blocks: [
        {
          id: "blk_capa",
          type: "image",
          props: {
            image: {
              url: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=70",
              alt: "Prato colorido e equilibrado",
            },
            aspect: "16:9",
            fit: "cover",
          },
          style: { radius: "lg", marginBottom: "lg" },
          animation: { preset: "zoom", delay: 0, duration: 500 },
        },
        {
          id: "blk_titulo",
          type: "heading",
          props: { text: "Descubra qual é o **seu tipo de metabolismo**", level: 1 },
          animation: { preset: "fade_up", delay: 80, duration: 450 },
        },
        {
          id: "blk_subtitulo",
          type: "text",
          props: {
            text: "6 perguntas rápidas e você recebe um diagnóstico personalizado — junto com o que fazer a partir dele.",
          },
          style: { marginBottom: "lg" },
          animation: { preset: "fade_up", delay: 160, duration: 450 },
        },
        {
          id: "blk_comecar",
          type: "button",
          props: {
            label: "Começar agora",
            subLabel: "leva menos de 2 minutos · é gratuito",
            action: { kind: "next" },
            icon: "ArrowRight",
          },
          animation: { preset: "fade_up", delay: 240, duration: 450 },
        },
      ],
    },

    // ── 2. Objetivo ────────────────────────────────────────
    {
      id: "step_objetivo",
      name: "Objetivo principal",
      type: "question",
      layout: { align: "center", fullHeight: true },
      logic: { rules: [] },
      blocks: [
        {
          id: "blk_progresso_1",
          type: "progress",
          props: { mode: "auto", showLabel: true, sticky: true },
          style: { marginBottom: "xl" },
        },
        {
          id: "blk_pergunta_objetivo",
          type: "heading",
          props: { text: "Qual é o seu principal objetivo hoje?", level: 1 },
          style: { marginBottom: "lg" },
        },
        {
          id: "blk_opcoes_objetivo",
          type: "choice",
          props: {
            name: "objetivo",
            multiple: false,
            layout: "list",
            autoAdvance: true,
            required: true,
            showLetters: false,
            options: [
              {
                id: "perder_peso",
                label: "Perder peso",
                emoji: "🔥",
                scores: { metabolismo_lento: 2 },
              },
              {
                id: "ganhar_massa",
                label: "Ganhar massa muscular",
                emoji: "💪",
                scores: { metabolismo_rapido: 2 },
              },
              {
                id: "mais_energia",
                label: "Ter mais energia no dia a dia",
                emoji: "⚡",
                scores: { metabolismo_equilibrado: 1, metabolismo_lento: 1 },
              },
              {
                id: "manter_saude",
                label: "Manter a saúde em dia",
                emoji: "🌱",
                scores: { metabolismo_equilibrado: 2 },
              },
            ],
          },
        },
      ],
    },

    // ── 3. Faixa etária ────────────────────────────────────
    {
      id: "step_idade",
      name: "Faixa etária",
      type: "question",
      layout: { align: "center", fullHeight: true },
      logic: { rules: [] },
      blocks: [
        {
          id: "blk_progresso_2",
          type: "progress",
          props: { mode: "auto", showLabel: true, sticky: true },
          style: { marginBottom: "xl" },
        },
        {
          id: "blk_pergunta_idade",
          type: "heading",
          props: { text: "Qual a sua faixa de idade?", level: 1 },
        },
        {
          id: "blk_texto_idade",
          type: "text",
          props: { text: "O metabolismo muda bastante ao longo da vida — isso pesa no resultado." },
          style: { marginBottom: "lg" },
        },
        {
          id: "blk_opcoes_idade",
          type: "choice",
          props: {
            name: "faixa_etaria",
            multiple: false,
            layout: "grid2",
            autoAdvance: true,
            required: true,
            showLetters: false,
            options: [
              { id: "ate_29", label: "Até 29 anos", emoji: "🙂", scores: { metabolismo_rapido: 2 } },
              { id: "de_30_a_39", label: "30 a 39 anos", emoji: "😃", scores: { metabolismo_equilibrado: 2 } },
              { id: "de_40_a_49", label: "40 a 49 anos", emoji: "😌", scores: { metabolismo_lento: 1 } },
              { id: "acima_de_50", label: "50 anos ou mais", emoji: "😎", scores: { metabolismo_lento: 2 } },
            ],
          },
        },
      ],
    },

    // ── 4. Rotina ──────────────────────────────────────────
    {
      id: "step_rotina",
      name: "Rotina de movimento",
      type: "question",
      layout: { align: "center", fullHeight: true },
      logic: { rules: [] },
      blocks: [
        {
          id: "blk_progresso_3",
          type: "progress",
          props: { mode: "auto", showLabel: true, sticky: true },
          style: { marginBottom: "xl" },
        },
        {
          id: "blk_pergunta_rotina",
          type: "heading",
          props: { text: "Como é a sua rotina de movimento?", level: 1 },
          style: { marginBottom: "lg" },
        },
        {
          id: "blk_opcoes_rotina",
          type: "choice",
          props: {
            name: "rotina",
            multiple: false,
            layout: "list",
            autoAdvance: true,
            required: true,
            showLetters: false,
            options: [
              {
                id: "sedentario",
                label: "Passo o dia sentado",
                description: "Pouco ou nenhum exercício na semana",
                scores: { metabolismo_lento: 3 },
              },
              {
                id: "leve",
                label: "Me movimento um pouco",
                description: "Caminhadas ou treino 1 a 2 vezes por semana",
                scores: { metabolismo_lento: 1, metabolismo_equilibrado: 1 },
              },
              {
                id: "ativo",
                label: "Treino com regularidade",
                description: "3 a 4 vezes por semana",
                scores: { metabolismo_equilibrado: 2 },
              },
              {
                id: "muito_ativo",
                label: "Treino quase todo dia",
                description: "5 vezes por semana ou mais",
                scores: { metabolismo_rapido: 3 },
              },
            ],
          },
        },
      ],
    },

    // ── 5. Prova social ────────────────────────────────────
    {
      id: "step_prova_social",
      name: "Prova social",
      type: "content",
      layout: { align: "center", fullHeight: true },
      logic: { rules: [] },
      blocks: [
        {
          id: "blk_prova_titulo",
          type: "heading",
          props: { text: "Você está no meio do caminho 🎉", level: 1 },
        },
        {
          id: "blk_prova_texto",
          type: "text",
          props: {
            text: "Mais de **40 mil pessoas** já descobriram o próprio perfil por aqui. Veja o que elas relatam:",
          },
          style: { marginBottom: "lg" },
        },
        {
          id: "blk_prova_lista",
          type: "list",
          props: {
            marker: "check",
            animated: true,
            stagger: 220,
            items: [
              { title: "Entendi por que nada funcionava comigo", description: "Marina, 34 anos" },
              { title: "Parei de brigar com a balança toda semana", description: "Rafael, 41 anos" },
              { title: "Finalmente um plano que cabe na minha rotina", description: "Juliana, 28 anos" },
            ],
          },
          style: { marginBottom: "lg" },
        },
        {
          id: "blk_prova_botao",
          type: "button",
          props: { label: "Continuar", action: { kind: "next" }, icon: "ArrowRight" },
        },
      ],
    },

    // ── 6. Energia ─────────────────────────────────────────
    {
      id: "step_energia",
      name: "Nível de energia",
      type: "question",
      layout: { align: "center", fullHeight: true },
      logic: { rules: [] },
      blocks: [
        {
          id: "blk_progresso_4",
          type: "progress",
          props: { mode: "auto", showLabel: true, sticky: true },
          style: { marginBottom: "xl" },
        },
        {
          id: "blk_pergunta_energia",
          type: "heading",
          props: { text: "Como você se sente no fim da tarde?", level: 1 },
          style: { marginBottom: "lg" },
        },
        {
          id: "blk_opcoes_energia",
          type: "choice",
          props: {
            name: "energia",
            multiple: false,
            layout: "list",
            autoAdvance: true,
            required: true,
            showLetters: false,
            options: [
              { id: "exausto", label: "Exausto, só quero deitar", emoji: "😵", scores: { metabolismo_lento: 3 } },
              { id: "cansado", label: "Cansado, mas dou conta", emoji: "😐", scores: { metabolismo_lento: 1 } },
              { id: "normal", label: "Normal, sem grandes quedas", emoji: "🙂", scores: { metabolismo_equilibrado: 2 } },
              { id: "disposto", label: "Ainda com energia de sobra", emoji: "⚡", scores: { metabolismo_rapido: 3 } },
            ],
          },
        },
      ],
    },

    // ── 7. Alimentação (múltipla escolha) ──────────────────
    {
      id: "step_alimentacao",
      name: "Hábitos alimentares",
      type: "question",
      layout: { align: "center", fullHeight: true },
      logic: { rules: [] },
      blocks: [
        {
          id: "blk_progresso_5",
          type: "progress",
          props: { mode: "auto", showLabel: true, sticky: true },
          style: { marginBottom: "xl" },
        },
        {
          id: "blk_pergunta_alimentacao",
          type: "heading",
          props: { text: "O que mais acontece na sua alimentação?", level: 1 },
        },
        {
          id: "blk_texto_alimentacao",
          type: "text",
          props: { text: "Pode marcar mais de uma." },
          style: { marginBottom: "lg" },
        },
        {
          id: "blk_opcoes_alimentacao",
          type: "choice",
          props: {
            name: "habitos",
            multiple: true,
            layout: "list",
            autoAdvance: false,
            required: true,
            showLetters: false,
            minSelect: 1,
            options: [
              { id: "pula_refeicoes", label: "Pulo refeições com frequência", scores: { metabolismo_lento: 2 } },
              { id: "belisca", label: "Belisco o dia inteiro", scores: { metabolismo_lento: 1 } },
              { id: "come_tarde", label: "Como muito tarde da noite", scores: { metabolismo_lento: 2 } },
              { id: "cozinha", label: "Cozinho a maior parte do que como", scores: { metabolismo_equilibrado: 2 } },
              { id: "muita_proteina", label: "Como bastante proteína", scores: { metabolismo_rapido: 2 } },
            ],
          },
          style: { marginBottom: "lg" },
        },
        {
          id: "blk_botao_alimentacao",
          type: "button",
          props: { label: "Continuar", action: { kind: "next" }, icon: "ArrowRight" },
        },
      ],
    },

    // ── 8. Nome ────────────────────────────────────────────
    {
      id: "step_nome",
      name: "Nome",
      type: "form",
      layout: { align: "center", fullHeight: true },
      logic: { rules: [] },
      blocks: [
        {
          id: "blk_progresso_6",
          type: "progress",
          props: { mode: "auto", showLabel: true, sticky: true },
          style: { marginBottom: "xl" },
        },
        {
          id: "blk_titulo_nome",
          type: "heading",
          props: { text: "Quase lá! Como podemos te chamar?", level: 1 },
        },
        {
          id: "blk_texto_nome",
          type: "text",
          props: { text: "Assim o seu diagnóstico sai com o seu nome." },
          style: { marginBottom: "lg" },
        },
        {
          id: "blk_campo_nome",
          type: "input",
          props: {
            name: "nome",
            inputType: "text",
            placeholder: "Seu primeiro nome",
            required: true,
          },
          style: { marginBottom: "lg" },
        },
        {
          id: "blk_botao_nome",
          type: "button",
          props: { label: "Ver meu diagnóstico", action: { kind: "next" }, icon: "Sparkles" },
        },
      ],
    },

    // ── 9. Personalizando ──────────────────────────────────
    {
      id: "step_carregando",
      name: "Personalizando o plano",
      type: "loading",
      layout: { align: "center", fullHeight: true },
      logic: { rules: [] },
      blocks: [
        {
          id: "blk_loader",
          type: "loader",
          props: {
            title: "Montando seu diagnóstico, {{nome}}",
            subtitle: "Cruzando suas respostas com o nosso banco de perfis",
            showPercent: true,
            onFinish: { kind: "next" },
            steps: [
              { label: "Analisando suas respostas", durationMs: 1400 },
              { label: "Comparando com mais de 40 mil perfis", durationMs: 1600 },
              { label: "Ajustando as recomendações para você", durationMs: 1500 },
            ],
          },
        },
      ],
    },

    // ── 10. Resultado ──────────────────────────────────────
    {
      id: "step_resultado",
      name: "Resultado",
      type: "result",
      layout: { align: "center", fullHeight: true },
      logic: { rules: [] },
      blocks: [
        {
          id: "blk_titulo_resultado",
          type: "heading",
          props: { text: "Pronto, {{nome}}!", level: 1 },
          style: { marginBottom: "lg" },
        },
        {
          id: "blk_resultado",
          type: "result",
          props: {
            outcomes: [
              {
                id: "metabolismo_lento",
                when: {
                  kind: "leaf",
                  ref: { source: "score", key: "metabolismo_lento" },
                  op: "gte",
                  value: 5,
                },
                badge: "Seu perfil",
                title: "Metabolismo em modo economia",
                description:
                  "Seu corpo está **estocando energia** em vez de gastá-la. Isso não é falta de força de vontade: é um padrão que se instala com rotina parada, refeições irregulares e noites mal dormidas.\n\nA boa notícia é que ele responde rápido quando o estímulo é o certo.",
              },
              {
                id: "metabolismo_rapido",
                when: {
                  kind: "leaf",
                  ref: { source: "score", key: "metabolismo_rapido" },
                  op: "gte",
                  value: 5,
                },
                badge: "Seu perfil",
                title: "Metabolismo acelerado",
                description:
                  "Você gasta energia com facilidade. Seu desafio não é queimar — é **sustentar**: sem comer o suficiente e na hora certa, o ganho que você busca não vem.",
              },
              {
                id: "metabolismo_equilibrado",
                badge: "Seu perfil",
                title: "Metabolismo equilibrado",
                description:
                  "Sua base está boa. O que trava o seu progresso não é o metabolismo, é a **consistência** — pequenos ajustes repetidos valem mais do que qualquer mudança radical.",
              },
            ],
          },
          style: { marginBottom: "lg" },
        },
        {
          id: "blk_botao_resultado",
          type: "button",
          props: {
            label: "Quero meu plano completo",
            action: { kind: "next" },
            icon: "ArrowRight",
          },
        },
      ],
    },

    // ── 11. Captura de e-mail ──────────────────────────────
    {
      id: "step_email",
      name: "Captura de e-mail",
      type: "form",
      layout: { align: "center", fullHeight: true },
      logic: { rules: [] },
      blocks: [
        {
          id: "blk_titulo_email",
          type: "heading",
          props: { text: "Para onde enviamos seu plano?", level: 1 },
        },
        {
          id: "blk_texto_email",
          type: "text",
          props: { text: "Enviamos o plano completo em PDF, sem custo." },
          style: { marginBottom: "lg" },
        },
        {
          id: "blk_campo_email",
          type: "input",
          props: {
            name: "email",
            inputType: "email",
            placeholder: "seu@email.com",
            required: true,
            blockDisposableEmail: true,
            helpText: "Nada de spam. Você pode sair quando quiser.",
          },
          style: { marginBottom: "lg" },
        },
        {
          id: "blk_botao_email",
          type: "button",
          props: { label: "Receber meu plano", action: { kind: "next" }, icon: "Mail" },
        },
      ],
    },

    // ── 12. Oferta ─────────────────────────────────────────
    {
      id: "step_oferta",
      name: "Oferta",
      type: "checkout",
      layout: { align: "center", fullHeight: false },
      logic: { rules: [], isEnd: true },
      blocks: [
        {
          id: "blk_titulo_oferta",
          type: "heading",
          props: { text: "Seu plano está a caminho, {{nome}} ✅", level: 1 },
        },
        {
          id: "blk_texto_oferta",
          type: "text",
          props: {
            text: "Enquanto ele não chega: quer o acompanhamento completo, ajustado ao seu perfil?",
          },
          style: { marginBottom: "lg" },
        },
        {
          id: "blk_lista_oferta",
          type: "list",
          props: {
            marker: "check",
            animated: true,
            stagger: 120,
            items: [
              { title: "Plano alimentar ajustado ao seu metabolismo" },
              { title: "Treinos para a rotina que você tem, não a ideal" },
              { title: "Acompanhamento semanal por 12 semanas" },
              { title: "Garantia de 7 dias, sem perguntas" },
            ],
          },
          style: { marginBottom: "lg" },
        },
        {
          id: "blk_botao_oferta",
          type: "button",
          props: {
            label: "Quero o acompanhamento completo",
            subLabel: "vagas limitadas por turma",
            action: { kind: "link", url: "https://exemplo.com/checkout", newTab: false },
          },
        },
      ],
    },
  ],
};
