import { z } from "zod";

import { Block } from "./block";
import { ColorValue, Condition, MediaImage, SlugId, SpaceValue } from "./common";

/**
 * Um step é uma tela do funil. O visitante vê um step por vez; a navegação
 * entre eles é client-side, sem recarregar a página.
 */

export const StepType = z
  .enum(["question", "content", "loading", "result", "form", "checkout"])
  .describe(
    "question = uma pergunta; content = tela de conteúdo/prova social; loading = 'personalizando seu plano'; result = diagnóstico; form = captura de dados; checkout = oferta final",
  );

export const StepBackground = z
  .object({
    color: ColorValue.optional(),
    image: MediaImage.optional(),
    /** Escurece a imagem de fundo para o texto continuar legível. 0 a 1. */
    overlay: z.number().min(0).max(1).optional(),
  })
  .strict();

export const StepLayout = z
  .object({
    align: z.enum(["left", "center"]).describe("Alinhamento padrão do conteúdo da tela"),
    /** Sobrescreve `theme.contentWidth` só nesta tela. */
    maxWidth: z.number().min(280).max(1400).optional(),
    paddingY: SpaceValue.optional(),
    background: StepBackground.optional(),
    /**
     * Centraliza verticalmente e ocupa a altura da tela. É o comportamento
     * esperado numa pergunta de quiz; desligue em telas de conteúdo longo.
     */
    fullHeight: z.boolean(),
  })
  .strict();

export const RoutingRule = z
  .object({
    id: SlugId,
    when: Condition,
    goto: SlugId.describe("ID do step de destino"),
  })
  .strict();

export const StepLogic = z
  .object({
    rules: z
      .array(RoutingRule)
      .describe(
        "Avaliadas em ordem ao sair do step; a primeira que casar define o destino. Se nenhuma casar, segue para o próximo step da lista.",
      ),
    /** Encerra o funil neste step, ignorando steps seguintes. */
    isEnd: z.boolean().optional(),
  })
  .strict();

export const StepSeo = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
  })
  .strict();

export const Step = z
  .object({
    id: SlugId.describe("Identificador legível e estável, ex.: 'step_objetivo'"),
    name: z.string().min(1).describe("Nome usado apenas no editor e nos relatórios"),
    type: StepType,
    layout: StepLayout,
    blocks: z.array(Block),
    logic: StepLogic,
    seo: StepSeo.optional().describe("Sobrescreve o SEO do funil nesta tela"),
  })
  .strict();

/**
 * A união de blocos é montada dinamicamente a partir do registro, então
 * `z.infer` devolve um objeto genérico para `blocks`. Trocamos esse campo pelo
 * tipo `Block` derivado das definições, que é o que estreita corretamente num
 * `switch (block.type)`.
 */
type StepFromSchema = z.infer<typeof Step>;
export type Step = Omit<StepFromSchema, "blocks"> & { blocks: Block[] };

export type RoutingRule = z.infer<typeof RoutingRule>;
export type StepLayout = z.infer<typeof StepLayout>;
export type StepType = z.infer<typeof StepType>;

export const defaultStepLayout: StepLayout = {
  align: "center",
  fullHeight: true,
};
