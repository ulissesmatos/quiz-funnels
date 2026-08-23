import { buttonBlock, loaderBlock, resultBlock } from "./definitions/action";
import {
  dividerBlock,
  headingBlock,
  listBlock,
  progressBlock,
  spacerBlock,
  textBlock,
} from "./definitions/content";
import { cartesianBlock, chartBlock, compareBlock, levelBlock } from "./definitions/data";
import { choiceBlock, inputBlock } from "./definitions/input";
import { audioBlock, carouselBlock, imageBlock, videoBlock } from "./definitions/media";
import {
  checkoutBlock,
  confettiBlock,
  countdownBlock,
  embedBlock,
  guaranteeBlock,
  pricingBlock,
  upsellBlock,
} from "./definitions/offer";
import {
  alertBlock,
  cardsBlock,
  faqBlock,
  marqueeBlock,
  termsBlock,
  testimonialsBlock,
} from "./definitions/proof";

export { createContainerBlock } from "./definitions/container";
export * from "./types";

/**
 * Todos os blocos que NÃO contêm outros blocos.
 *
 * Esta lista é o registro central: o editor monta a paleta a partir dela, o
 * schema monta a união discriminada, e o copiloto de IA aprende o vocabulário
 * de blocos aqui. Adicionar um bloco = criar a definição e incluir nesta lista.
 *
 * A ordem importa só para o desempate dentro de uma categoria da paleta; o
 * agrupamento vem de `blockCategories`.
 */
export const leafBlockDefinitions = [
  // Conteúdo
  headingBlock,
  textBlock,
  listBlock,
  alertBlock,
  faqBlock,
  termsBlock,
  // Entrada
  choiceBlock,
  inputBlock,
  // Mídia
  imageBlock,
  videoBlock,
  audioBlock,
  carouselBlock,
  // Ação
  buttonBlock,
  loaderBlock,
  resultBlock,
  pricingBlock,
  checkoutBlock,
  upsellBlock,
  guaranteeBlock,
  countdownBlock,
  confettiBlock,
  // Prova social
  cardsBlock,
  testimonialsBlock,
  marqueeBlock,
  // Dados
  chartBlock,
  cartesianBlock,
  levelBlock,
  compareBlock,
  // Layout
  progressBlock,
  dividerBlock,
  spacerBlock,
  embedBlock,
] as const;

export type LeafBlockDefinition = (typeof leafBlockDefinitions)[number];
export type LeafBlockType = LeafBlockDefinition["type"];

export const leafBlockTypes = leafBlockDefinitions.map((d) => d.type) as LeafBlockType[];
