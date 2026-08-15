import { z } from "zod";

import { coresDoPreset } from "../theme/presets";
import { SlugId, VariableKey } from "./common";
import { Step } from "./step";
import { Theme, defaultTheme, type ThemeMode } from "./theme";

/**
 * Variáveis que não vêm de respostas: parâmetros de URL (UTM, `?nome=`) e
 * constantes. As respostas dos blocos de entrada viram variáveis
 * automaticamente pelo `name` do bloco — não precisam ser declaradas aqui.
 */
export const FunnelVariable = z
  .object({
    key: VariableKey,
    label: z.string().optional(),
    source: z
      .enum(["query", "constant"])
      .describe("query = lido do parâmetro de URL de mesmo nome; constant = valor fixo"),
    defaultValue: z.string().optional(),
  })
  .strict();

export const FunnelPixels = z
  .object({
    metaPixelId: z.string().optional(),
    googleAdsId: z.string().optional(),
    googleTagManagerId: z.string().optional(),
    /** Disparado ao concluir o funil, além do PageView de cada step. */
    conversionEventName: z.string().optional(),
  })
  .strict();

export const FunnelSeo = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional().describe("Imagem de compartilhamento (Open Graph)"),
    faviconUrl: z.string().optional(),
    noindex: z.boolean().optional(),
  })
  .strict();

export const FunnelSettings = z
  .object({
    seo: FunnelSeo,
    pixels: FunnelPixels,
    /** URL para onde redirecionar quando o funil termina, se houver. */
    redirectOnComplete: z.string().optional(),
    showBranding: z.boolean(),
  })
  .strict();

/**
 * Onde cada tela fica no canvas de fluxo.
 *
 * É a única informação do mapa que precisa ser guardada — nós são as telas e
 * arestas são as regras, ambos já no documento. Opcional de propósito: sem
 * posição gravada o mapa se organiza sozinho, e telas criadas pela IA entram
 * sem coordenada nenhuma.
 */
export const FunnelFlow = z
  .object({
    positions: z.record(SlugId, z.object({ x: z.number(), y: z.number() }).strict()),
  })
  .strict();

/**
 * O documento completo do funil. É o que fica no banco em `jsonb`, o que o
 * editor manipula e o que o copiloto de IA edita por operações.
 */
export const FunnelDocument = z
  .object({
    /** Versão do formato do documento. Sobe quando houver migração de schema. */
    schemaVersion: z.literal(1),
    name: z.string().min(1).describe("Nome interno do funil"),
    slug: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]{1,63}$/, "Use minúsculas, números e hífen")
      .describe("Compõe a URL pública: /f/{slug}"),
    locale: z.string().default("pt-BR"),
    theme: Theme,
    settings: FunnelSettings,
    variables: z.array(FunnelVariable),
    steps: z.array(Step).min(1).describe("A ordem desta lista é o caminho padrão do funil"),
    flow: FunnelFlow.optional(),
  })
  .strict()
  .superRefine((doc, ctx) => {
    // Um `goto` apontando para um step inexistente deixaria o visitante preso.
    // Vale validar aqui: é o erro mais provável de uma edição feita pela IA.
    const stepIds = new Set(doc.steps.map((s) => s.id));

    doc.steps.forEach((step, stepIndex) => {
      step.logic.rules.forEach((rule, ruleIndex) => {
        if (!stepIds.has(rule.goto)) {
          ctx.addIssue({
            code: "custom",
            path: ["steps", stepIndex, "logic", "rules", ruleIndex, "goto"],
            message: `O step "${rule.goto}" não existe neste funil`,
          });
        }
      });
    });

    const duplicateStep = findDuplicate(doc.steps.map((s) => s.id));
    if (duplicateStep) {
      ctx.addIssue({
        code: "custom",
        path: ["steps"],
        message: `O id de step "${duplicateStep}" aparece mais de uma vez`,
      });
    }
  });

/** Mesmo motivo de `Step`: `steps` precisa carregar o tipo estreito de bloco. */
type FunnelFromSchema = z.infer<typeof FunnelDocument>;
export type FunnelDocument = Omit<FunnelFromSchema, "steps"> & { steps: Step[] };

export type FunnelVariable = z.infer<typeof FunnelVariable>;
export type FunnelSettings = z.infer<typeof FunnelSettings>;

export type ParseResult =
  | { success: true; data: FunnelDocument; error?: undefined }
  | { success: false; data?: undefined; error: z.ZodError };

/**
 * Valida um documento vindo do banco, da IA ou do editor.
 *
 * Use sempre esta função no lugar de `FunnelDocument.safeParse`: a união de
 * blocos é montada em tempo de execução a partir do registro, então o tipo que
 * o Zod infere para `blocks` é genérico. A validação em si é completa — o que
 * falta é só o TypeScript enxergar a união estreita, e é isso que o cast
 * abaixo restabelece.
 */
export function parseFunnelDocument(value: unknown): ParseResult {
  const result = FunnelDocument.safeParse(value);

  return result.success
    ? { success: true, data: result.data as unknown as FunnelDocument }
    : { success: false, error: result.error };
}

/** Mensagem curta do primeiro problema, pronta para exibir ao usuário. */
export function describeParseError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Documento inválido.";

  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

function findDuplicate(values: string[]): string | undefined {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return undefined;
}

/**
 * Documento mínimo válido, usado ao criar um funil novo.
 *
 * `mode` vem da preferência padrão da organização (ver Configurações) — o
 * preset continua "roxo", só a paleta clara/escura muda; a pessoa troca os
 * dois depois, na aba Tema.
 */
export function createEmptyFunnel(name: string, slug: string, mode: ThemeMode = "dark"): FunnelDocument {
  return {
    schemaVersion: 1,
    name,
    slug,
    locale: "pt-BR",
    theme: { ...defaultTheme, mode, colors: coresDoPreset("roxo", mode) },
    settings: {
      seo: {},
      pixels: {},
      showBranding: true,
    },
    variables: [],
    steps: [
      {
        id: "step_1",
        name: "Primeira tela",
        type: "content",
        layout: { align: "center", fullHeight: true },
        blocks: [
          {
            id: "blk_titulo",
            type: "heading",
            props: { text: "Sua promessa aqui", level: 1 },
          },
          {
            id: "blk_botao",
            type: "button",
            props: { label: "Começar", action: { kind: "next" } },
          },
        ],
        logic: { rules: [] },
      },
    ],
  };
}

/** Ids de step válidos, para montar seletores no editor. */
export function listStepIds(doc: FunnelDocument): SlugIdList {
  return doc.steps.map((s) => ({ id: s.id, name: s.name }));
}

type SlugIdList = { id: z.infer<typeof SlugId>; name: string }[];
