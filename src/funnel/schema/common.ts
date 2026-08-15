import { z } from "zod";

/**
 * Peças compartilhadas do documento de funil.
 *
 * Regras que valem para TODO este diretório (elas existem para manter o
 * documento fácil de uma LLM ler e escrever):
 *   1. IDs são slugs legíveis (`blk_titulo`, `step_objetivo`), nunca UUID.
 *   2. Props são planas e nomeadas — nada de aninhamento profundo.
 *   3. Toda união é discriminada por um campo `kind`/`type` explícito.
 *   4. Todo campo tem `.describe()` — essas descrições viram o JSON Schema
 *      entregue às tools da IA, então são a documentação que o modelo lê.
 */

/** `step_objetivo`, `blk_titulo_principal`. Minúsculas, dígitos e `_`. */
export const SlugId = z
  .string()
  .regex(
    /^[a-z][a-z0-9_]{0,63}$/,
    "Deve começar com letra minúscula e conter apenas letras minúsculas, números e underscore",
  );

/** Chave de variável usada em `{{nome}}` e como nome de campo da resposta. */
export const VariableKey = SlugId;

// ─────────────────────────────────────────────────────────────
// Valores responsivos
// ─────────────────────────────────────────────────────────────

/**
 * Um valor que pode mudar no desktop. `base` vale sempre (mobile-first);
 * `md` sobrescreve a partir de 768px. Só dois breakpoints — de propósito:
 * mais do que isso vira um inferno para o usuário e para a IA.
 */
export function responsive<T extends z.ZodTypeAny>(inner: T) {
  return z.union([
    inner,
    z.object({ base: inner, md: inner.optional() }),
  ]);
}

export type Responsive<T> = T | { base: T; md?: T };

// ─────────────────────────────────────────────────────────────
// Cores, espaçamento e estilo
// ─────────────────────────────────────────────────────────────

/**
 * Uma cor é um token do tema (`primary`, `text`, `surface`, …) ou um valor CSS
 * literal (`#ff0055`, `rgba(0,0,0,.5)`, `transparent`). Preferir token: assim a
 * troca de tema repinta o funil inteiro de uma vez.
 */
export const ColorValue = z
  .string()
  .min(1)
  .describe(
    "Token do tema (primary, primaryFg, accent, bg, surface, text, muted, border, success, danger) ou cor CSS literal (#ff0055, rgba(...), transparent)",
  );

export const SpaceValue = z
  .union([z.number(), z.enum(["none", "xs", "sm", "md", "lg", "xl", "2xl"])])
  .describe("Token de espaçamento do tema ou número em pixels");

export const RadiusValue = z
  .union([z.number(), z.enum(["none", "sm", "md", "lg", "xl", "full"])])
  .describe("Token de raio de borda do tema ou número em pixels");

export const ShadowValue = z.enum(["none", "sm", "md", "lg", "xl"]);

export const AlignValue = z.enum(["left", "center", "right"]);

export type ColorValue = z.infer<typeof ColorValue>;
export type SpaceValue = z.infer<typeof SpaceValue>;
export type RadiusValue = z.infer<typeof RadiusValue>;
export type ShadowValue = z.infer<typeof ShadowValue>;
export type AlignValue = z.infer<typeof AlignValue>;

/**
 * Ajustes visuais pontuais sobre o que o tema já define. É um subconjunto
 * fechado: não existe CSS livre. Isso mantém o render previsível, impede o
 * usuário de quebrar o próprio layout e evita que a IA invente propriedades.
 */
export const StyleOverride = z
  .object({
    align: responsive(AlignValue).optional(),
    textColor: ColorValue.optional(),
    bgColor: ColorValue.optional(),
    fontSize: responsive(z.union([z.number(), z.enum(["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"])])).optional(),
    fontWeight: z.union([z.literal(300), z.literal(400), z.literal(500), z.literal(600), z.literal(700), z.literal(800), z.literal(900)]).optional(),
    lineHeight: z.number().min(0.8).max(3).optional(),
    letterSpacing: z.number().min(-5).max(20).optional(),
    marginTop: SpaceValue.optional(),
    marginBottom: SpaceValue.optional(),
    paddingX: SpaceValue.optional(),
    paddingY: SpaceValue.optional(),
    radius: RadiusValue.optional(),
    borderColor: ColorValue.optional(),
    borderWidth: z.number().min(0).max(20).optional(),
    shadow: ShadowValue.optional(),
    maxWidth: z.union([z.number(), z.literal("full")]).optional(),
    /** Esconde o bloco em um breakpoint (ex.: `{ base: true, md: false }`). */
    hidden: responsive(z.boolean()).optional(),
  })
  .strict();

export type StyleOverride = z.infer<typeof StyleOverride>;

// ─────────────────────────────────────────────────────────────
// Animação de entrada
// ─────────────────────────────────────────────────────────────

export const AnimationPreset = z.enum([
  "none",
  "fade",
  "fade_up",
  "fade_down",
  "zoom",
  "slide_left",
  "slide_right",
]);

export const BlockAnimation = z
  .object({
    preset: AnimationPreset.default("none"),
    /** Atraso em milissegundos antes de animar — útil para cascata. */
    delay: z.number().min(0).max(5000).default(0),
    duration: z.number().min(50).max(3000).default(400),
  })
  .strict();

export type BlockAnimation = z.infer<typeof BlockAnimation>;

// ─────────────────────────────────────────────────────────────
// Condições (visibilidade de bloco e roteamento entre steps)
// ─────────────────────────────────────────────────────────────

export const ConditionOperator = z.enum([
  "eq",
  "neq",
  "contains",
  "not_contains",
  "gt",
  "gte",
  "lt",
  "lte",
  "is_set",
  "is_empty",
]);

/**
 * O que a condição observa:
 *   `{ source: "answer", key: "objetivo" }`  → resposta de um campo
 *   `{ source: "score" }`                    → pontuação total
 *   `{ source: "score", key: "energia" }`    → pontuação de uma categoria
 *   `{ source: "variable", key: "utm_source" }`
 */
export const ConditionRef = z
  .object({
    source: z.enum(["answer", "score", "variable"]),
    key: VariableKey.optional().describe(
      "Nome do campo/categoria/variável. Omitir apenas quando source = 'score' (pontuação total).",
    ),
  })
  .strict();

export type ConditionLeaf = {
  kind: "leaf";
  ref: z.infer<typeof ConditionRef>;
  op: z.infer<typeof ConditionOperator>;
  value?: string | number | boolean | string[];
};

export type Condition =
  | ConditionLeaf
  | { kind: "all"; conditions: Condition[] }
  | { kind: "any"; conditions: Condition[] }
  | { kind: "not"; condition: Condition };

export const Condition: z.ZodType<Condition> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z
      .object({
        kind: z.literal("leaf"),
        ref: ConditionRef,
        op: ConditionOperator,
        value: z
          .union([z.string(), z.number(), z.boolean(), z.array(z.string())])
          .optional()
          .describe("Dispensável para os operadores is_set e is_empty"),
      })
      .strict(),
    z
      .object({ kind: z.literal("all"), conditions: z.array(Condition).min(1) })
      .strict()
      .describe("Verdadeiro quando TODAS as condições internas são verdadeiras (E)"),
    z
      .object({ kind: z.literal("any"), conditions: z.array(Condition).min(1) })
      .strict()
      .describe("Verdadeiro quando QUALQUER condição interna é verdadeira (OU)"),
    z.object({ kind: z.literal("not"), condition: Condition }).strict(),
  ]),
);

// ─────────────────────────────────────────────────────────────
// Ações (o que um botão / opção faz)
// ─────────────────────────────────────────────────────────────

export const BlockAction = z
  .discriminatedUnion("kind", [
    z.object({ kind: z.literal("next") }).strict().describe("Avança para o próximo step aplicando a lógica de roteamento"),
    z.object({ kind: z.literal("back") }).strict().describe("Volta ao step anterior"),
    z
      .object({ kind: z.literal("goto"), stepId: SlugId })
      .strict()
      .describe("Vai direto para um step específico, ignorando o roteamento"),
    z
      .object({
        kind: z.literal("link"),
        url: z.string().min(1).describe("Aceita interpolação: https://site.com?nome={{nome}}"),
        newTab: z.boolean().default(false),
      })
      .strict(),
    z
      .object({
        kind: z.literal("whatsapp"),
        phone: z.string().min(8).describe("Formato internacional, só dígitos. Ex.: 5511999999999"),
        message: z.string().default("").describe("Mensagem pré-preenchida, aceita interpolação"),
      })
      .strict(),
    z
      .object({ kind: z.literal("submit") })
      .strict()
      .describe("Grava a resposta e conclui o funil"),
  ])
  .describe("O que acontece ao clicar");

export type BlockAction = z.infer<typeof BlockAction>;

// ─────────────────────────────────────────────────────────────
// Mídia
// ─────────────────────────────────────────────────────────────

export const MediaImage = z
  .object({
    url: z
      .string()
      .describe("URL da imagem. Vazio significa 'ainda não escolhida' — o editor mostra um placeholder."),
    alt: z.string().default(""),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
  })
  .strict();

export type MediaImage = z.infer<typeof MediaImage>;
